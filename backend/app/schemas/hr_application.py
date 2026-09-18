from datetime import datetime
from pydantic import BaseModel

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


class HRApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
