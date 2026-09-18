from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

OptionalShortText = Annotated[str | None, Field(max_length=150)]
OptionalUrl = Annotated[str | None, Field(max_length=500)]


class ApplicantProfileUpdate(BaseModel):
    phone: Annotated[str | None, Field(max_length=50)] = None
    location: OptionalShortText = None
    professional_title: OptionalShortText = None
    summary: Annotated[str | None, Field(max_length=3000)] = None
    linkedin_url: OptionalUrl = None
    github_url: OptionalUrl = None

    @field_validator("phone", "location", "professional_title", "summary", "linkedin_url", "github_url")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("linkedin_url", "github_url")
    @classmethod
    def validate_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        HttpUrl(value)
        return value


class ApplicantProfileResponse(BaseModel):
    id: int | None = None
    user_id: int
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    location: str | None = None
    professional_title: str | None = None
    summary: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class CVResponse(BaseModel):
    id: int
    original_filename: str
    content_type: str
    file_size: int
    is_primary: bool
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)
