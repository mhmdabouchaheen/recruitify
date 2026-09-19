from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.contract import ContractStatus, ContractType

ALLOWED_CURRENCIES = {"USD", "EUR", "GBP", "LBP", "AED", "SAR"}


class ContractBase(BaseModel):
    contract_type: ContractType
    start_date: date
    end_date: date | None = None
    salary_amount: float | None = Field(default=None, ge=0)
    salary_currency: str | None = Field(default=None, min_length=3, max_length=3)
    work_location: str = Field(min_length=1, max_length=255)
    probation_period: str | None = Field(default=None, max_length=150)
    additional_terms: str | None = Field(default=None, max_length=5000)

    @field_validator("work_location", "probation_period", "additional_terms", mode="before")
    @classmethod
    def strip_optional_text(cls, value):
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @field_validator("salary_currency")
    @classmethod
    def validate_currency(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        normalized = value.strip().upper()
        if normalized not in ALLOWED_CURRENCIES:
            raise ValueError("Unsupported salary currency")
        return normalized

    @model_validator(mode="after")
    def validate_dates_and_salary(self):
        if self.end_date and self.end_date < self.start_date:
            raise ValueError("End date cannot be before start date")
        if self.salary_amount is not None and not self.salary_currency:
            raise ValueError("Salary currency is required when salary amount is provided")
        return self


class ContractCreate(ContractBase):
    pass


class ContractUpdate(BaseModel):
    contract_type: ContractType | None = None
    start_date: date | None = None
    end_date: date | None = None
    salary_amount: float | None = Field(default=None, ge=0)
    salary_currency: str | None = Field(default=None, min_length=3, max_length=3)
    work_location: str | None = Field(default=None, min_length=1, max_length=255)
    probation_period: str | None = Field(default=None, max_length=150)
    additional_terms: str | None = Field(default=None, max_length=5000)

    @field_validator("work_location", "probation_period", "additional_terms", mode="before")
    @classmethod
    def strip_optional_text(cls, value):
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @field_validator("salary_currency")
    @classmethod
    def validate_currency(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        normalized = value.strip().upper()
        if normalized not in ALLOWED_CURRENCIES:
            raise ValueError("Unsupported salary currency")
        return normalized


class ContractResponse(BaseModel):
    id: int
    application_id: int
    contract_type: ContractType
    start_date: date
    end_date: date | None = None
    salary_amount: float | None = None
    salary_currency: str | None = None
    work_location: str
    probation_period: str | None = None
    additional_terms: str | None = None
    status: ContractStatus
    has_pdf: bool = False
    created_at: datetime
    updated_at: datetime
    sent_at: datetime | None = None
    responded_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
