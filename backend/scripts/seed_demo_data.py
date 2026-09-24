"""Safe Recruitify demo data seeder.

Dry-run by default. To write demo data from backend/:
    $env:ALLOW_DEMO_SEED="true"
    python scripts/seed_demo_data.py --apply
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.ai_analysis import ApplicationMatch, CVAnalysis
from app.models.applicant import ApplicantProfile, CV
from app.models.application import Application, ApplicationActivity, ApplicationAnswer, ApplicationStatus
from app.models.contract import Contract, ContractStatus, ContractType
from app.models.interview import Interview, InterviewEvaluation, InterviewInterviewer, InterviewQuestion, InterviewQuestionSource, InterviewRecommendation, InterviewStatus, InterviewType
from app.models.job import ApplicationQuestion, EmploymentType, Job, JobSkill, JobStatus, SkillType, WorkplaceType
from app.models.user import User, UserRole
from app.services.cv_storage import save_cv_bytes

DEMO_DOMAIN = "demo.recruitify.local"
PASSWORD = os.getenv("DEMO_SEED_PASSWORD", "RecruitifyDemo123!")
NOW = datetime.now(timezone.utc).replace(microsecond=0)

APP_FIRST = 0
APP_LAST = 1
APP_TITLE = 2
APP_JOB_TITLE = 3
APP_STATUS = 4
APP_SUBMITTED_DAYS_AGO = 5
APP_SKILLS_SCORE = 6
APP_EXPERIENCE_SCORE = 7
APP_EDUCATION_SCORE = 8
APP_MATCHED_REQUIRED = 9
APP_MATCHED_PREFERRED = 10
APP_MISSING_REQUIRED = 11
APP_EXPERIENCE_YEARS = 12
APP_OVERALL_SCORE = 13

JOBS = [
    {"title":"Senior Full Stack Developer","department":"Engineering","location":"Beirut, Lebanon","employment_type":EmploymentType.FULL_TIME,"workplace_type":WorkplaceType.HYBRID,"status":JobStatus.PUBLISHED,"experience":"4+ years","education":"Computer Science degree or equivalent","deadline":38,"positions":2,"required":["JavaScript","React","REST APIs","PostgreSQL","Git"],"preferred":["Node.js","FastAPI","Docker","AWS"],"questions":["Describe a complex full-stack feature you delivered.","How do you debug production issues?"],"days":86},
    {"title":"Frontend Engineer","department":"Engineering","location":"Remote","employment_type":EmploymentType.FULL_TIME,"workplace_type":WorkplaceType.REMOTE,"status":JobStatus.PUBLISHED,"experience":"2+ years","education":"Relevant degree or portfolio","deadline":26,"positions":1,"required":["React","JavaScript","CSS","HTML"],"preferred":["TypeScript","Tailwind CSS","Testing Library"],"questions":["What makes a frontend experience accessible?","Share a React performance improvement you made."],"days":72},
    {"title":"HR Operations Specialist","department":"HR","location":"Beirut, Lebanon","employment_type":EmploymentType.FULL_TIME,"workplace_type":WorkplaceType.ONSITE,"status":JobStatus.PUBLISHED,"experience":"2+ years","education":"HR, Business, or Psychology degree","deadline":20,"positions":1,"required":["Recruitment","Onboarding","HRIS","Communication"],"preferred":["Payroll","Employee Relations","Excel"],"questions":["How do you keep HR records accurate?","Describe an onboarding process you improved."],"days":64},
    {"title":"Financial Analyst","department":"Finance","location":"Dubai, UAE","employment_type":EmploymentType.FULL_TIME,"workplace_type":WorkplaceType.HYBRID,"status":JobStatus.PUBLISHED,"experience":"3+ years","education":"Finance or Accounting degree","deadline":45,"positions":1,"required":["Financial Modeling","Excel","Budgeting","Reporting"],"preferred":["Power BI","SQL","Forecasting"],"questions":["Describe a financial model you built.","How do you explain variance to non-finance teams?"],"days":58},
    {"title":"Operations Coordinator","department":"Operations","location":"Amman, Jordan","employment_type":EmploymentType.FULL_TIME,"workplace_type":WorkplaceType.ONSITE,"status":JobStatus.PUBLISHED,"experience":"1+ years","education":"Bachelor's degree or equivalent","deadline":12,"positions":1,"required":["Operations","Coordination","Reporting","Vendor Management"],"preferred":["Process Improvement","Excel","Project Management"],"questions":["How do you manage competing priorities?","Describe a process you improved."],"days":50},
    {"title":"Digital Marketing Manager","department":"Marketing","location":"Riyadh, Saudi Arabia","employment_type":EmploymentType.FULL_TIME,"workplace_type":WorkplaceType.HYBRID,"status":JobStatus.DRAFT,"experience":"4+ years","education":"Marketing or Communications degree","deadline":None,"positions":1,"required":["SEO","Google Analytics","Campaign Management","Content Strategy"],"preferred":["HubSpot","Paid Social","Email Marketing"],"questions":["What campaign result are you most proud of?","How do you measure content quality?"],"days":22},
    {"title":"Junior Accountant","department":"Finance","location":"Beirut, Lebanon","employment_type":EmploymentType.PART_TIME,"workplace_type":WorkplaceType.ONSITE,"status":JobStatus.CLOSED,"experience":"0-2 years","education":"Accounting or Finance degree","deadline":-8,"positions":1,"required":["Accounting","Excel","Reconciliation"],"preferred":["QuickBooks","Accounts Payable","Reporting"],"questions":["How do you check your work for accuracy?","Describe your accounting coursework or experience."],"days":118},
]

APPLICANTS = [
    ("Ali","Karam","Full Stack Developer","Senior Full Stack Developer",ApplicationStatus.SELECTED,92,91,96,86,["JavaScript","React","REST APIs","PostgreSQL","Git"],["Node.js","Docker"],[],5.0,92),
    ("Sara","Nasser","Frontend Developer","Frontend Engineer",ApplicationStatus.SELECTED,76,84,91,74,["React","JavaScript","CSS","HTML"],["Tailwind CSS","Testing Library"],[],3.0,92),
    ("Omar","Khalil","Backend Developer","Senior Full Stack Developer",ApplicationStatus.SELECTED,70,78,68,76,["JavaScript","REST APIs","PostgreSQL","Git"],["FastAPI","Docker"],["React"],4.0,88),
    ("Layla","Younes","Frontend Engineer","Frontend Engineer",ApplicationStatus.INTERVIEW_COMPLETED,66,82,55,72,["React","JavaScript","CSS","HTML"],["Tailwind CSS"],["Testing Library"],2.5,86),
    ("Karim","Maaloof","HR Coordinator","HR Operations Specialist",ApplicationStatus.SHORTLISTED,61,88,70,78,["Recruitment","Onboarding","HRIS","Communication"],["Excel"],[],3.0,85),
    ("Rana","Haddad","HR Assistant","HR Operations Specialist",ApplicationStatus.UNDER_REVIEW,55,72,50,80,["Recruitment","Communication","Onboarding"],["Excel"],["HRIS"],1.5,75),
    ("Tarek","Nasser","Financial Analyst","Financial Analyst",ApplicationStatus.INTERVIEW_SCHEDULED,44,90,84,82,["Financial Modeling","Excel","Budgeting","Reporting"],["Power BI","SQL"],[],4.0,90),
    ("Jad","Abou Rizk","FP&A Analyst","Financial Analyst",ApplicationStatus.INTERVIEW_COMPLETED,38,86,88,78,["Financial Modeling","Excel","Reporting"],["Power BI","Forecasting"],["Budgeting"],5.5,86),
    ("Hadi","Faraj","Operations Coordinator","Operations Coordinator",ApplicationStatus.SELECTED,33,92,76,74,["Operations","Coordination","Reporting","Vendor Management"],["Excel","Project Management"],[],2.0,79),
    ("Maya","Zein","Project Coordinator","Operations Coordinator",ApplicationStatus.REJECTED,29,68,58,70,["Coordination","Reporting"],["Process Improvement"],["Operations","Vendor Management"],2.0,70),
    ("Nour","Fakhoury","Digital Marketing Specialist","Digital Marketing Manager",ApplicationStatus.APPLIED,20,89,82,74,["SEO","Google Analytics","Campaign Management","Content Strategy"],["HubSpot"],[],4.5,78),
    ("Lea","Mansour","Content Strategist","Digital Marketing Manager",ApplicationStatus.APPLIED,18,64,55,76,["Content Strategy","SEO"],["Email Marketing"],["Google Analytics","Campaign Management"],3.0,72),
    ("Yara","Tannous","Junior Accountant","Junior Accountant",ApplicationStatus.INTERVIEW_COMPLETED,111,88,64,84,["Accounting","Excel","Reconciliation"],["QuickBooks"],[],1.0,82),
    ("Hassan","Zein","Accounting Assistant","Junior Accountant",ApplicationStatus.REJECTED,108,61,46,70,["Accounting","Excel"],["Accounts Payable"],["Reconciliation"],1.5,66),
    ("Celine","Hakim","React Developer","Frontend Engineer",ApplicationStatus.UNDER_REVIEW,14,83,62,70,["React","JavaScript","HTML","CSS"],["TypeScript"],["Testing Library"],2.0,74),
    ("Fadi","Azar","Full Stack Engineer","Senior Full Stack Developer",ApplicationStatus.INTERVIEW_COMPLETED,9,89,90,88,["JavaScript","React","REST APIs","PostgreSQL","Git"],["AWS"],[],6.0,90),
    ("Rami","Sfeir","Software Developer","Senior Full Stack Developer",ApplicationStatus.SHORTLISTED,7,69,58,60,["JavaScript","REST APIs","Git"],["FastAPI"],["React","PostgreSQL"],3.0,70),
    ("Dina","Saad","HR Generalist","HR Operations Specialist",ApplicationStatus.APPLIED,4,80,72,83,["Recruitment","Onboarding","Communication"],["Payroll","Employee Relations"],["HRIS"],4.0,76),
]

INTERVIEWS = [
    ("layla.younes",-18,InterviewStatus.COMPLETED,InterviewType.VIDEO,45,InterviewRecommendation.YES,(4,4,4,4)),
    ("tarek.nasser",5,InterviewStatus.SCHEDULED,InterviewType.VIDEO,60,None,None),
    ("jad.abourizk",-12,InterviewStatus.COMPLETED,InterviewType.ONSITE,60,InterviewRecommendation.STRONG_YES,(5,4,5,5)),
    ("yara.tannous",-6,InterviewStatus.COMPLETED,InterviewType.PHONE,30,InterviewRecommendation.YES,(4,5,4,4)),
    ("fadi.azar",-3,InterviewStatus.COMPLETED,InterviewType.VIDEO,60,InterviewRecommendation.YES,(5,4,5,5)),
    ("hadi.faraj",-28,InterviewStatus.COMPLETED,InterviewType.ONSITE,45,InterviewRecommendation.STRONG_YES,(4,5,4,5)),
]

CONTRACTS = [
    ("ali.karam",ContractStatus.ACCEPTED,ContractType.FULL_TIME,4200.0,"USD",11),
    ("sara.nasser",ContractStatus.SENT,ContractType.FULL_TIME,2600.0,"USD",None),
    ("omar.khalil",ContractStatus.DECLINED,ContractType.FULL_TIME,3600.0,"USD",5),
]


def email_for(first, last):
    return f"{first.lower()}.{last.lower().replace(' ', '')}@{DEMO_DOMAIN}"


def get_user(db, email):
    return db.scalar(select(User).where(User.email == email.lower()))


def ensure_user(db, email, first, last, role, actions, days=120):
    user = get_user(db, email)
    if user:
        if not user.email.endswith("@" + DEMO_DOMAIN):
            raise RuntimeError(f"Refusing to reuse non-demo user {email}")
        return user
    created = NOW - timedelta(days=days)
    user = User(first_name=first, last_name=last, email=email.lower(), hashed_password=hash_password(PASSWORD), role=role, is_active=True, created_at=created, updated_at=created)
    db.add(user)
    db.flush()
    actions.append(f"create user {email}")
    return user


def minimal_pdf(text):
    stream = f"BT /F1 12 Tf 72 720 Td ({text[:130]}) Tj ET".encode("latin-1", "ignore")
    objs = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n",
        b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
        b"5 0 obj << /Length " + str(len(stream)).encode() + b" >> stream\n" + stream + b"\nendstream endobj\n",
    ]
    data = b"%PDF-1.4\n"
    offsets = [0]
    for obj in objs:
        offsets.append(len(data))
        data += obj
    xref = len(data)
    data += f"xref\n0 {len(objs)+1}\n0000000000 65535 f \n".encode()
    for off in offsets[1:]:
        data += f"{off:010d} 00000 n \n".encode()
    return data + f"trailer << /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()


def ensure_job_children(db, job, seed, actions):
    existing_skills = {(s.name.lower(), s.skill_type.value) for s in job.skills}
    for skill_type, names in ((SkillType.REQUIRED, seed["required"]), (SkillType.PREFERRED, seed["preferred"])):
        for name in names:
            if (name.lower(), skill_type.value) not in existing_skills:
                db.add(JobSkill(job_id=job.id, name=name, skill_type=skill_type))
                actions.append(f"add skill {name} to {job.title}")
    existing_questions = {q.question.lower() for q in job.application_questions}
    for index, text in enumerate(seed["questions"], 1):
        if text.lower() not in existing_questions:
            db.add(ApplicationQuestion(job_id=job.id, question=text, question_type="text", is_required=True, display_order=index))
            actions.append(f"add question to {job.title}")


def ensure_job(db, seed, hr, actions):
    job = db.scalar(select(Job).options(selectinload(Job.skills), selectinload(Job.application_questions)).where(Job.title == seed["title"], Job.department == seed["department"]))
    if job:
        if job.created_by_id != hr.id:
            raise RuntimeError(f"Refusing to modify existing non-demo job {seed['title']}")
        ensure_job_children(db, job, seed, actions)
        return job
    created = NOW - timedelta(days=seed["days"])
    deadline = date.today() + timedelta(days=seed["deadline"]) if seed["deadline"] is not None else None
    job = Job(title=seed["title"], department=seed["department"], location=seed["location"], employment_type=seed["employment_type"], workplace_type=seed["workplace_type"], status=seed["status"], description=f"Recruitify is hiring a {seed['title']} to support growing teams.", responsibilities="Own relevant workstreams, collaborate cross-functionally, and communicate progress clearly.", requirements="Demonstrated experience with the required skills and a practical, collaborative working style.", required_experience=seed["experience"], required_education=seed["education"], application_deadline=deadline, positions_count=seed["positions"], created_by_id=hr.id, created_at=created, updated_at=created)
    db.add(job)
    db.flush()
    actions.append(f"create job {seed['title']}")
    ensure_job_children(db, job, seed, actions)
    return job


def ensure_profile_cv(db, user, data, actions):
    first, last, title = data[APP_FIRST], data[APP_LAST], data[APP_TITLE]
    if not db.scalar(select(ApplicantProfile).where(ApplicantProfile.user_id == user.id)):
        db.add(ApplicantProfile(user_id=user.id, phone=f"+961 70 10{user.id:04d}", location="Beirut, Lebanon", professional_title=title, summary=f"{title} with practical experience and clear communication.", linkedin_url=f"https://linkedin.com/in/{first.lower()}-{last.lower().replace(' ', '-')}-demo"))
        actions.append(f"create profile {user.email}")
    stored = f"demo-{user.email.replace('@','-at-')}.pdf"
    cv = db.scalar(select(CV).where(CV.user_id == user.id, CV.stored_filename == stored))
    if not cv:
        content = minimal_pdf(f"Demo CV for {first} {last}, {title}")
        # If a previous failed DB transaction already uploaded this deterministic
        # key, this overwrites the same object instead of creating a duplicate.
        save_cv_bytes(stored, content, "application/pdf")
        cv = CV(user_id=user.id, original_filename=f"{first}_{last.replace(' ', '_')}_CV.pdf", stored_filename=stored, content_type="application/pdf", file_size=len(content), is_primary=True, uploaded_at=NOW - timedelta(days=data[APP_SUBMITTED_DAYS_AGO] + 2))
        db.add(cv)
        db.flush()
        actions.append(f"create CV {stored}")
    return cv


def add_history(db, app, final_status, hr_id, submitted):
    path = [ApplicationStatus.APPLIED]
    for status in [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.SHORTLISTED, ApplicationStatus.INTERVIEW_SCHEDULED, ApplicationStatus.INTERVIEW_COMPLETED, ApplicationStatus.SELECTED]:
        if final_status in [status, ApplicationStatus.SELECTED] and status not in path:
            path.append(status)
    if final_status == ApplicationStatus.REJECTED:
        path += [ApplicationStatus.UNDER_REVIEW, final_status]
    if final_status not in path:
        path.append(final_status)
    previous = None
    for i, status in enumerate(path):
        db.add(ApplicationActivity(application_id=app.id, actor_id=hr_id if i else None, event_type="application_submitted" if i == 0 else "status_changed", from_status=previous, to_status=status, created_at=submitted + timedelta(days=i * 4)))
        previous = status


def ensure_application(db, user, cv, job, data, hr, actions):
    app = db.scalar(select(Application).where(Application.applicant_id == user.id, Application.job_id == job.id))
    if app:
        return app
    submitted = NOW - timedelta(days=data[APP_SUBMITTED_DAYS_AGO])
    app = Application(applicant_id=user.id, job_id=job.id, cv_id=cv.id, status=data[APP_STATUS], submitted_at=submitted, updated_at=submitted, rejection_feedback="Thank you for applying. Other candidates more closely matched the current role requirements." if data[APP_STATUS] == ApplicationStatus.REJECTED else None)
    db.add(app)
    db.flush()
    actions.append(f"create application {user.email} -> {job.title}")
    for q in job.application_questions:
        db.add(ApplicationAnswer(application_id=app.id, question_id=q.id, answer=f"{user.first_name} shared relevant experience for {job.title}."))
    add_history(db, app, data[APP_STATUS], hr.id, submitted)
    return app


def ensure_match(db, cv, app, data, actions):
    analysis = db.scalar(select(CVAnalysis).where(CVAnalysis.cv_id == cv.id))
    if not analysis:
        skills = data[APP_MATCHED_REQUIRED] + data[APP_MATCHED_PREFERRED]
        analysis = CVAnalysis(cv_id=cv.id, extracted_text_preview=f"Demo CV for {data[APP_FIRST]} {data[APP_LAST]}", professional_summary=f"{data[APP_TITLE]} with {data[APP_EXPERIENCE_YEARS]} years of experience.", skills=skills, technologies=skills, education=[{"degree":"Relevant degree"}], experience=[{"title":data[APP_TITLE],"years":data[APP_EXPERIENCE_YEARS]}], total_experience_years=data[APP_EXPERIENCE_YEARS], job_titles=[data[APP_TITLE]], notable_projects=["Recruitify demo project"], analysis_provider="deterministic-demo")
        db.add(analysis)
        db.flush()
        actions.append(f"create CV analysis {cv.id}")
    if not db.scalar(select(ApplicationMatch).where(ApplicationMatch.application_id == app.id)):
        db.add(ApplicationMatch(application_id=app.id, cv_analysis_id=analysis.id, overall_score=data[APP_OVERALL_SCORE], skills_score=data[APP_SKILLS_SCORE], experience_score=data[APP_EXPERIENCE_SCORE], education_score=data[APP_EDUCATION_SCORE], matched_required_skills=data[APP_MATCHED_REQUIRED], matched_preferred_skills=data[APP_MATCHED_PREFERRED], missing_required_skills=data[APP_MISSING_REQUIRED], relevant_experience=f"{data[APP_EXPERIENCE_YEARS]} years relevant experience.", education_assessment="Education is suitable for the role.", strengths=["Relevant experience", "Clear skill alignment"], gaps=data[APP_MISSING_REQUIRED] or ["Continue validating depth during interview"], explanation="Deterministic demo match; no Gemini call was used."))
        actions.append(f"create AI match {app.id}")


def ensure_interviews(db, apps, interviewers, hr, actions):
    for i, item in enumerate(INTERVIEWS):
        app = apps[f"{item[0]}@{DEMO_DOMAIN}"]
        if db.scalar(select(Interview).where(Interview.application_id == app.id)):
            continue
        scheduled = (NOW + timedelta(days=item[1])).replace(hour=10 + i, minute=0, second=0)
        link = "https://meet.google.com/recruitify-demo" if item[3] == InterviewType.VIDEO else "Recruitify Office" if item[3] == InterviewType.ONSITE else "+961 1 555 010"
        interview = Interview(application_id=app.id, scheduled_at=scheduled, duration_minutes=item[4], interview_type=item[3], location_or_link=link, status=item[2], created_by_id=hr.id, created_at=scheduled - timedelta(days=3), updated_at=scheduled - timedelta(days=3))
        interviewer = interviewers[i % len(interviewers)]
        interview.interviewers = [InterviewInterviewer(interviewer_id=interviewer.id)]
        interview.questions = [InterviewQuestion(question="Tell us about a relevant recent project.", category="Experience", source=InterviewQuestionSource.MANUAL), InterviewQuestion(question="How would you approach your first 30 days?", category="Role Fit", source=InterviewQuestionSource.AI)]
        db.add(interview)
        db.flush()
        actions.append(f"create interview {app.id}")
        if item[2] == InterviewStatus.COMPLETED:
            r = item[6]
            db.add(InterviewEvaluation(interview_id=interview.id, interviewer_id=interviewer.id, technical_rating=r[0], communication_rating=r[1], problem_solving_rating=r[2], overall_rating=r[3], strengths="Prepared, relevant examples, and clear communication.", concerns="Continue validating depth in final stage.", comments="Demo evaluation.", recommendation=item[5], submitted_at=scheduled + timedelta(hours=2), updated_at=scheduled + timedelta(hours=2)))
            actions.append(f"create evaluation {app.id}")


def ensure_contracts(db, apps, hr, actions):
    for prefix, status, ctype, salary, currency, responded_days in CONTRACTS:
        app = apps[f"{prefix}@{DEMO_DOMAIN}"]
        if db.scalar(select(Contract).where(Contract.application_id == app.id)):
            continue
        sent_at = NOW - timedelta(days=14)
        responded_at = NOW - timedelta(days=responded_days) if responded_days is not None else None
        db.add(Contract(application_id=app.id, created_by_id=hr.id, contract_type=ctype, start_date=date.today()+timedelta(days=30), salary_amount=salary, salary_currency=currency, work_location=app.job.location, probation_period="3 months", additional_terms="Standard Recruitify demo employment terms.", status=status, sent_at=sent_at, responded_at=responded_at, created_at=sent_at-timedelta(days=2), updated_at=responded_at or sent_at))
        db.add(ApplicationActivity(application_id=app.id, actor_id=hr.id, event_type="contract_prepared", created_at=sent_at-timedelta(days=2)))
        db.add(ApplicationActivity(application_id=app.id, actor_id=hr.id, event_type="contract_sent", created_at=sent_at))
        if status in {ContractStatus.ACCEPTED, ContractStatus.DECLINED}:
            db.add(ApplicationActivity(application_id=app.id, actor_id=app.applicant_id, event_type="contract_accepted" if status == ContractStatus.ACCEPTED else "contract_declined", created_at=responded_at))
        actions.append(f"create {status.value} contract {app.id}")


def seed(db):
    actions = []
    hr = ensure_user(db, f"maya.haddad@{DEMO_DOMAIN}", "Maya", "Haddad", UserRole.HR, actions, 160)
    interviewers = [ensure_user(db, f"sarah.khalil@{DEMO_DOMAIN}", "Sarah", "Khalil", UserRole.INTERVIEWER, actions, 150), ensure_user(db, f"karim.mansour@{DEMO_DOMAIN}", "Karim", "Mansour", UserRole.INTERVIEWER, actions, 148)]
    jobs = {j["title"]: ensure_job(db, j, hr, actions) for j in JOBS}
    apps = {}
    for data in APPLICANTS:
        email = email_for(data[APP_FIRST], data[APP_LAST])
        user = ensure_user(db, email, data[APP_FIRST], data[APP_LAST], UserRole.APPLICANT, actions, data[APP_SUBMITTED_DAYS_AGO] + 7)
        cv = ensure_profile_cv(db, user, data, actions)
        app = ensure_application(db, user, cv, jobs[data[APP_JOB_TITLE]], data, hr, actions)
        ensure_match(db, cv, app, data, actions)
        apps[email] = app
    ensure_interviews(db, apps, interviewers, hr, actions)
    ensure_contracts(db, apps, hr, actions)
    return actions


def dry_run(db):
    missing_users = sum(1 for d in APPLICANTS if get_user(db, email_for(d[APP_FIRST], d[APP_LAST])) is None)
    missing_internal = sum(1 for e in [f"maya.haddad@{DEMO_DOMAIN}", f"sarah.khalil@{DEMO_DOMAIN}", f"karim.mansour@{DEMO_DOMAIN}"] if get_user(db, e) is None)
    missing_jobs = sum(1 for j in JOBS if db.scalar(select(Job).where(Job.title == j["title"], Job.department == j["department"])) is None)
    return [f"would ensure {len(JOBS)} jobs ({missing_jobs} new)", f"would ensure {len(APPLICANTS)} applicant users/profiles/CVs/applications ({missing_users} new users)", f"would ensure {missing_internal} internal demo users", f"would ensure deterministic AI analyses/matches, {len(INTERVIEWS)} interviews/evaluations, and {len(CONTRACTS)} contracts"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    db = SessionLocal()
    try:
        if not args.apply:
            print("Dry run only. No database rows or files will be created.")
            for line in dry_run(db):
                print("- " + line)
            print("Run with --apply and ALLOW_DEMO_SEED=true to create demo data.")
            return 0
        if os.getenv("ALLOW_DEMO_SEED", "").lower() != "true":
            print("Refusing to write demo data: set ALLOW_DEMO_SEED=true and pass --apply.")
            return 2
        try:
            actions = seed(db)
            db.commit()
        except Exception:
            db.rollback()
            raise
        print(f"Demo seed complete. Created/ensured {len(actions)} items.")
        for action in actions:
            print("- " + action)
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
