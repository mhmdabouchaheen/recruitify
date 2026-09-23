from datetime import datetime
from pydantic import BaseModel, Field, field_validator

from app.models.application import ApplicationStatus
from app.schemas.application import ApplicationAnswerResponse
from app.schemas.applicant import CVResponse
from app.schemas.job import JobResponse


class HRApplicantSummary(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str


class HRApplicantProfileResponse(BaseModel):
    phone: str | None = None
    location: str | None = None
    professional_title: str | None = None
    summary: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None


class HRApplicationListItem(BaseModel):
    id: int
    status: ApplicationStatus
    submitted_at: datetime
    applicant_id: int
    applicant_first_name: str
    applicant_last_name: str
    applicant_email: str
    job_id: int
    job_title: str
    department: str
    location: str
    match_score: float | None = None
    contract_status: str | None = None


class HRApplicationDetail(BaseModel):
    id: int
    status: ApplicationStatus
    submitted_at: datetime
    updated_at: datetime
    withdrawn_at: datetime | None = None
    applicant: HRApplicantSummary
    applicant_profile: HRApplicantProfileResponse | None = None
    job: JobResponse
    cv: CVResponse
    answers: list[ApplicationAnswerResponse]
    rejection_feedback: str | None = None


class HRApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
    rejection_feedback: str | None = Field(default=None, max_length=5000)

    @field_validator("rejection_feedback")
    @classmethod
    def strip_rejection_feedback(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

class HRApplicationNoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Note content is required")
        return stripped


class HRApplicationNoteResponse(BaseModel):
    id: int
    application_id: int
    content: str
    created_at: datetime
    updated_at: datetime
    author_id: int
    author_first_name: str
    author_last_name: str


class HRApplicationActivityResponse(BaseModel):
    id: int
    application_id: int
    actor_id: int | None = None
    actor_first_name: str | None = None
    actor_last_name: str | None = None
    event_type: str
    from_status: ApplicationStatus | None = None
    to_status: ApplicationStatus | None = None
    created_at: datetime
