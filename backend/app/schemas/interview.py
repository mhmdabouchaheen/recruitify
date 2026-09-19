from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.application import ApplicationStatus
from app.models.interview import InterviewQuestionSource, InterviewRecommendation, InterviewStatus, InterviewType


class InterviewerSummary(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str


class InterviewQuestionResponse(BaseModel):
    id: int
    question: str
    category: str
    source: InterviewQuestionSource
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterviewQuestionCreate(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    category: str = Field(default="General", min_length=1, max_length=100)

    @field_validator("question", "category")
    @classmethod
    def strip_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("This field is required")
        return stripped


class InterviewEvaluationCreate(BaseModel):
    technical_rating: int = Field(ge=1, le=5)
    communication_rating: int = Field(ge=1, le=5)
    problem_solving_rating: int = Field(ge=1, le=5)
    overall_rating: int = Field(ge=1, le=5)
    strengths: str | None = Field(default=None, max_length=5000)
    concerns: str | None = Field(default=None, max_length=5000)
    comments: str | None = Field(default=None, max_length=5000)
    recommendation: InterviewRecommendation

    @field_validator("strengths", "concerns", "comments")
    @classmethod
    def strip_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class InterviewEvaluationResponse(BaseModel):
    id: int
    interview_id: int
    interviewer_id: int
    interviewer_first_name: str
    interviewer_last_name: str
    technical_rating: int
    communication_rating: int
    problem_solving_rating: int
    overall_rating: int
    strengths: str | None = None
    concerns: str | None = None
    comments: str | None = None
    recommendation: InterviewRecommendation
    submitted_at: datetime
    updated_at: datetime


class InterviewCreate(BaseModel):
    scheduled_at: datetime
    duration_minutes: int = Field(ge=15, le=480)
    interview_type: InterviewType
    location_or_link: str | None = Field(default=None, max_length=500)
    interviewer_ids: list[int] = Field(min_length=1)

    @field_validator("interviewer_ids")
    @classmethod
    def unique_interviewers(cls, value: list[int]) -> list[int]:
        if len(value) != len(set(value)):
            raise ValueError("Interviewers must be unique")
        return value

    @field_validator("location_or_link")
    @classmethod
    def strip_location(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class InterviewUpdate(BaseModel):
    scheduled_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=15, le=480)
    interview_type: InterviewType | None = None
    location_or_link: str | None = Field(default=None, max_length=500)
    status: InterviewStatus | None = None
    interviewer_ids: list[int] | None = None

    @field_validator("interviewer_ids")
    @classmethod
    def unique_optional_interviewers(cls, value: list[int] | None) -> list[int] | None:
        if value is not None and (not value or len(value) != len(set(value))):
            raise ValueError("Interviewers must be unique")
        return value

    @field_validator("location_or_link")
    @classmethod
    def strip_optional_location(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class InterviewListItem(BaseModel):
    id: int
    application_id: int
    scheduled_at: datetime
    duration_minutes: int
    interview_type: InterviewType
    location_or_link: str | None = None
    status: InterviewStatus
    candidate_name: str
    job_title: str
    department: str
    interviewers: list[InterviewerSummary]


class InterviewDetail(InterviewListItem):
    application_status: ApplicationStatus
    candidate_email: str | None = None
    candidate_profile: dict | None = None
    cv_analysis: dict | None = None
    questions: list[InterviewQuestionResponse] = Field(default_factory=list)
    evaluations: list[InterviewEvaluationResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ApplicantInterviewResponse(BaseModel):
    id: int
    application_id: int
    scheduled_at: datetime
    duration_minutes: int
    interview_type: InterviewType
    location_or_link: str | None = None
    status: InterviewStatus


class GeneratedInterviewQuestionsResponse(BaseModel):
    questions: list[InterviewQuestionResponse]
