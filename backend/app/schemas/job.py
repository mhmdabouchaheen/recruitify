from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.job import EmploymentType, JobStatus, SkillType, WorkplaceType


def strip_required_string(value: str) -> str:
    stripped = value.strip()
    if not stripped:
        raise ValueError("Value cannot be blank")
    return stripped


def strip_optional_string(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


class JobSkillCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    skill_type: SkillType

    model_config = ConfigDict(extra="forbid")

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return strip_required_string(value)


class JobSkillResponse(BaseModel):
    id: int
    job_id: int
    name: str
    skill_type: SkillType

    model_config = ConfigDict(from_attributes=True)


class ApplicationQuestionCreate(BaseModel):
    question: str = Field(min_length=1)
    question_type: str = Field(min_length=1, max_length=50)
    is_required: bool = True
    display_order: int = Field(default=0, ge=0)

    model_config = ConfigDict(extra="forbid")

    @field_validator("question", "question_type")
    @classmethod
    def validate_text(cls, value: str) -> str:
        return strip_required_string(value)


class ApplicationQuestionResponse(BaseModel):
    id: int
    job_id: int
    question: str
    question_type: str
    is_required: bool
    display_order: int

    model_config = ConfigDict(from_attributes=True)


class JobBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    department: str = Field(min_length=1, max_length=150)
    location: str = Field(min_length=1, max_length=255)
    employment_type: EmploymentType
    workplace_type: WorkplaceType
    status: JobStatus
    description: str = Field(min_length=1)
    responsibilities: str | None = None
    requirements: str = Field(min_length=1)
    required_experience: str | None = Field(default=None, max_length=150)
    required_education: str | None = Field(default=None, max_length=150)
    application_deadline: date | None = None
    positions_count: int = Field(default=1, ge=1)
    skills: list[JobSkillCreate] = Field(default_factory=list)
    application_questions: list[ApplicationQuestionCreate] = Field(default_factory=list)

    @field_validator("title", "department", "location", "description", "requirements")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        return strip_required_string(value)

    @field_validator("responsibilities", "required_experience", "required_education")
    @classmethod
    def validate_optional_text(cls, value: str | None) -> str | None:
        return strip_optional_string(value)


class JobCreate(JobBase):
    model_config = ConfigDict(extra="forbid")


class JobUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    department: str | None = Field(default=None, min_length=1, max_length=150)
    location: str | None = Field(default=None, min_length=1, max_length=255)
    employment_type: EmploymentType | None = None
    workplace_type: WorkplaceType | None = None
    status: JobStatus | None = None
    description: str | None = Field(default=None, min_length=1)
    responsibilities: str | None = None
    requirements: str | None = Field(default=None, min_length=1)
    required_experience: str | None = Field(default=None, max_length=150)
    required_education: str | None = Field(default=None, max_length=150)
    application_deadline: date | None = None
    positions_count: int | None = Field(default=None, ge=1)
    skills: list[JobSkillCreate] | None = None
    application_questions: list[ApplicationQuestionCreate] | None = None

    model_config = ConfigDict(extra="forbid")

    @field_validator("title", "department", "location", "description", "requirements")
    @classmethod
    def validate_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return strip_required_string(value)

    @field_validator("responsibilities", "required_experience", "required_education")
    @classmethod
    def validate_optional_text(cls, value: str | None) -> str | None:
        return strip_optional_string(value)


class JobResponse(BaseModel):
    id: int
    title: str
    department: str
    location: str
    employment_type: EmploymentType
    workplace_type: WorkplaceType
    status: JobStatus
    description: str
    responsibilities: str | None
    requirements: str
    required_experience: str | None
    required_education: str | None
    application_deadline: date | None
    positions_count: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    skills: list[JobSkillResponse] = Field(default_factory=list)
    application_questions: list[ApplicationQuestionResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
