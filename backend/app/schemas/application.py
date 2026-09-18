from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.application import ApplicationStatus
from app.schemas.job import JobResponse
from app.schemas.applicant import CVResponse


class ApplicationAnswerCreate(BaseModel):
    question_id: int
    answer: str = Field(min_length=1, max_length=5000)

    @field_validator("answer")
    @classmethod
    def strip_answer(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Answer is required")
        return stripped


class ApplicationCreate(BaseModel):
    job_id: int
    cv_id: int
    answers: list[ApplicationAnswerCreate] = Field(default_factory=list)


class ApplicationAnswerResponse(BaseModel):
    id: int
    question_id: int
    question: str = Field(validation_alias="question_text")
    answer: str


class ApplicationResponse(BaseModel):
    id: int
    applicant_id: int
    job_id: int
    cv_id: int
    status: ApplicationStatus
    submitted_at: datetime
    updated_at: datetime
    withdrawn_at: datetime | None = None
    job: JobResponse
    cv: CVResponse
    answers: list[ApplicationAnswerResponse]

    model_config = ConfigDict(from_attributes=True)

