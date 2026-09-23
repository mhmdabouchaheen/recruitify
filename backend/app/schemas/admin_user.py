from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole


INTERNAL_ROLES = {UserRole.ADMIN, UserRole.HR, UserRole.INTERVIEWER}


class AdminUserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminUserCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    role: UserRole
    password: str = Field(min_length=8, max_length=128)

    @field_validator("first_name", "last_name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Name cannot be blank")
        return stripped

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()

    @field_validator("role")
    @classmethod
    def validate_internal_role(cls, value: UserRole) -> UserRole:
        if value not in INTERNAL_ROLES:
            raise ValueError("Admin can create only internal users")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if value != value.strip():
            raise ValueError("Password cannot start or end with whitespace")
        if not any(character.islower() for character in value):
            raise ValueError("Password must include a lowercase letter")
        if not any(character.isupper() for character in value):
            raise ValueError("Password must include an uppercase letter")
        if not any(character.isdigit() for character in value):
            raise ValueError("Password must include a number")
        return value


class AdminUserRoleUpdate(BaseModel):
    role: UserRole


class AdminUserStatusUpdate(BaseModel):
    is_active: bool
