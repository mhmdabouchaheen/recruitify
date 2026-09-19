import re
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models.ai_analysis import ApplicationMatch, CVAnalysis
from app.models.application import Application
from app.models.job import Job, JobSkill, SkillType
from app.services.ai_analysis import AIProviderError, AIProviderUnavailable, provider
from app.services.cv_extraction import CVExtractionError, extract_pdf_text

KNOWN_SKILLS = {
    "python", "javascript", "typescript", "react", "vite", "fastapi", "django", "flask", "sql", "postgresql",
    "mysql", "mongodb", "docker", "aws", "azure", "git", "html", "css", "tailwind", "node", "express",
    "java", "c#", "php", "laravel", "figma", "excel", "power bi", "tableau", "communication", "leadership",
    "recruitment", "sourcing", "screening", "interviewing", "onboarding", "payroll", "analytics", "testing", "qa",
}
EDUCATION_TERMS = ["bachelor", "master", "phd", "doctorate", "degree", "university", "college", "diploma", "certificate"]
TITLE_TERMS = ["engineer", "developer", "manager", "specialist", "analyst", "designer", "recruiter", "coordinator", "assistant", "consultant"]


def get_stored_application_match(db: Session, application_id: int) -> ApplicationMatch | None:
    return db.scalar(
        select(ApplicationMatch)
        .options(selectinload(ApplicationMatch.cv_analysis))
        .where(ApplicationMatch.application_id == application_id)
    )


def run_application_ai_analysis(db: Session, application_id: int, refresh: bool = False) -> ApplicationMatch | None:
    application = db.scalar(
        select(Application)
        .options(
            selectinload(Application.cv),
            selectinload(Application.job).selectinload(Job.skills),
        )
        .where(Application.id == application_id)
    )
    if application is None:
        return None

    if not refresh:
        existing = get_stored_application_match(db, application_id)
        if existing is not None:
            return existing

    try:
        cv_analysis = get_or_create_cv_analysis(db, application.cv_id, application.cv.stored_filename, refresh=refresh)
        match = calculate_and_store_match(db, application, cv_analysis)
        db.commit()
        return get_stored_application_match(db, application_id) or match
    except (SQLAlchemyError, CVExtractionError, AIProviderError, AIProviderUnavailable):
        db.rollback()
        raise


def get_or_create_cv_analysis(db: Session, cv_id: int, stored_filename: str, refresh: bool = False) -> CVAnalysis:
    existing = db.scalar(select(CVAnalysis).where(CVAnalysis.cv_id == cv_id))
    if existing is not None and not refresh:
        return existing

    text = extract_pdf_text(stored_filename)
    analysis_provider = "deterministic"
    if provider.configured():
        structured_model = provider.analyze_cv(text)
        structured = structured_model.model_dump()
        analysis_provider = "gemini"
    else:
        structured = structure_cv_text(text)
    if existing is None:
        existing = CVAnalysis(cv_id=cv_id)
        db.add(existing)
    for field, value in structured.items():
        setattr(existing, field, value)
    existing.extracted_text_preview = text[:4000]
    existing.analysis_provider = analysis_provider
    db.flush()
    return existing


def structure_cv_text(text: str) -> dict:
    lower = text.lower()
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    skills = sorted({skill for skill in KNOWN_SKILLS if skill in lower})
    education = [line for line in lines if any(term in line.lower() for term in EDUCATION_TERMS)][:8]
    experience_lines = [line for line in lines if re.search(r"\b(experience|worked|developed|managed|led|built|implemented|responsible)\b", line, re.I)][:10]
    years = extract_years_of_experience(lower)
    titles = [line for line in lines if any(term in line.lower() for term in TITLE_TERMS)][:8]
    projects = [line for line in lines if re.search(r"\b(project|portfolio|system|platform|application)\b", line, re.I)][:8]
    return {
        "professional_summary": " ".join(lines[:3])[:1000] if lines else None,
        "skills": skills,
        "technologies": [skill for skill in skills if skill not in {"communication", "leadership", "recruitment", "sourcing", "screening", "interviewing", "onboarding"}],
        "education": education,
        "experience": experience_lines,
        "total_experience_years": years,
        "job_titles": titles,
        "notable_projects": projects,
    }


def extract_years_of_experience(text: str) -> float | None:
    matches = [float(value) for value in re.findall(r"(\d+(?:\.\d+)?)\+?\s*(?:years|yrs)", text)]
    return max(matches) if matches else None


def calculate_and_store_match(db: Session, application: Application, cv_analysis: CVAnalysis) -> ApplicationMatch:
    required = [skill.name for skill in application.job.skills if skill_type_value(skill) == SkillType.REQUIRED.value]
    preferred = [skill.name for skill in application.job.skills if skill_type_value(skill) == SkillType.PREFERRED.value]
    candidate_terms = normalize_terms([*cv_analysis.skills, *cv_analysis.technologies])
    matched_required = match_skills(required, candidate_terms)
    matched_preferred = match_skills(preferred, candidate_terms)
    missing_required = [skill for skill in required if skill not in matched_required]

    skills_score, skill_note = score_skills(required, preferred, matched_required, matched_preferred)
    experience_score = score_experience(cv_analysis.total_experience_years, application.job.required_experience)
    education_score = score_education(cv_analysis.education, application.job.required_education)
    overall = round(skills_score * 0.60 + experience_score * 0.25 + education_score * 0.15, 2)

    strengths = []
    gaps = []
    if matched_required:
        strengths.append(f"Verified required skills: {', '.join(matched_required)}.")
    if matched_preferred:
        strengths.append(f"Verified preferred skills: {', '.join(matched_preferred)}.")
    if skill_note:
        strengths.append(skill_note)
    if missing_required:
        gaps.append(f"Missing required skill evidence: {', '.join(missing_required)}.")
    if required and not matched_required:
        gaps.append("No required job skills were found in the structured CV analysis.")
    if experience_score < 70:
        gaps.append("Experience evidence may not fully match the requirement.")
    if education_score < 70:
        gaps.append("Education evidence may not fully match the requirement.")

    match = get_stored_application_match(db, application.id) or ApplicationMatch(application_id=application.id)
    match.cv_analysis_id = cv_analysis.id
    match.overall_score = overall
    match.skills_score = skills_score
    match.experience_score = experience_score
    match.education_score = education_score
    match.matched_required_skills = matched_required
    match.matched_preferred_skills = matched_preferred
    match.missing_required_skills = missing_required
    match.relevant_experience = " ".join(cv_analysis.experience[:3])[:1000] or "No clear experience section was extracted."
    match.education_assessment = education_assessment(cv_analysis.education, application.job.required_education, education_score)
    match.strengths = strengths
    match.gaps = gaps
    match.explanation = f"Recruitify calculated this {overall}% match using skills 60%, experience 25%, and education 15%. This is decision support only."
    if not required and not preferred:
        match.explanation += " This job has no configured required or preferred skills, so the skills component used a neutral not-configured score."
    db.add(match)
    db.flush()
    return match


def skill_type_value(skill: JobSkill) -> str:
    value = skill.skill_type
    return value.value if hasattr(value, "value") else str(value)


def normalize_skill(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9+#]+", "", value.strip().lower())
    equivalents = {
        "nodejs": "nodejs",
        "node": "nodejs",
        "reactjs": "react",
        "react": "react",
        "postgresql": "postgresql",
        "postgres": "postgresql",
        "postgre": "postgresql",
        "javascript": "javascript",
        "js": "javascript",
        "typescript": "typescript",
        "ts": "typescript",
    }
    return equivalents.get(normalized, normalized)


def normalize_terms(values: list[str]) -> set[str]:
    return {normalize_skill(value) for value in values if value and value.strip()}


def match_skills(job_skills: list[str], candidate_terms: set[str]) -> list[str]:
    matched = []
    for skill in job_skills:
        normalized = normalize_skill(skill)
        if normalized and normalized in candidate_terms:
            matched.append(skill)
    return matched


def score_skills(required: list[str], preferred: list[str], matched_required: list[str], matched_preferred: list[str]) -> tuple[float, str | None]:
    if not required and not preferred:
        return 50.0, "No job skills are configured, so Recruitify used a neutral skills score."
    if required and preferred:
        required_score = len(matched_required) / len(required) * 100
        preferred_score = len(matched_preferred) / len(preferred) * 100
        return round(required_score * 0.8 + preferred_score * 0.2, 2), None
    if required:
        return round(len(matched_required) / len(required) * 100, 2), None
    return round(len(matched_preferred) / len(preferred) * 100, 2), None


def score_experience(candidate_years: float | None, required_experience: str | None) -> float:
    if not required_experience:
        return 100.0
    required_numbers = [float(value) for value in re.findall(r"\d+(?:\.\d+)?", required_experience)]
    if not required_numbers:
        return 70.0 if candidate_years is not None else 50.0
    required_years = min(required_numbers)
    if candidate_years is None:
        return 40.0
    return round(min(candidate_years / required_years, 1) * 100, 2) if required_years else 100.0


def score_education(education: list[str], required_education: str | None) -> float:
    if not required_education:
        return 100.0
    if not education:
        return 45.0
    required = required_education.lower()
    edu_text = " ".join(education).lower()
    if required in edu_text or any(term in edu_text and term in required for term in EDUCATION_TERMS):
        return 100.0
    return 65.0


def education_assessment(education: list[str], required_education: str | None, score: float) -> str:
    if not required_education:
        return "No specific education requirement was provided for this job."
    if score >= 90:
        return f"Extracted education evidence appears to align with: {required_education}."
    if education:
        return f"Education evidence was found, but it may not fully match: {required_education}."
    return f"No clear education evidence was extracted for requirement: {required_education}."

