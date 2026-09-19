from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class CVAnalysisResponse(BaseModel):
    id: int
    cv_id: int
    professional_summary: str | None = None
    skills: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)
    education: list[str] = Field(default_factory=list)
    experience: list[str] = Field(default_factory=list)
    total_experience_years: float | None = None
    job_titles: list[str] = Field(default_factory=list)
    notable_projects: list[str] = Field(default_factory=list)
    analysis_provider: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationMatchResponse(BaseModel):
    id: int
    application_id: int
    cv_analysis_id: int
    overall_score: float
    skills_score: float
    experience_score: float
    education_score: float
    matched_required_skills: list[str] = Field(default_factory=list)
    matched_preferred_skills: list[str] = Field(default_factory=list)
    missing_required_skills: list[str] = Field(default_factory=list)
    relevant_experience: str | None = None
    education_assessment: str | None = None
    strengths: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    explanation: str
    cv_analysis: CVAnalysisResponse
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
