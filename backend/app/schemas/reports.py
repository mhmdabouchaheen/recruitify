
from pydantic import BaseModel


class ReportOption(BaseModel):
    value: str
    label: str


class ReportMetric(BaseModel):
    label: str
    value: int | float | str


class ReportsFilters(BaseModel):
    jobs: list[ReportOption]
    departments: list[str]
    statuses: list[str]


class RecruitmentReportsResponse(BaseModel):
    filters: ReportsFilters
    funnel: dict
    applications_over_time: list[dict]
    applications_by_status: list[dict]
    job_performance: list[dict]
    applications_by_department: list[dict]
    ai_match: dict
    interview_outcomes: dict
    contract_outcomes: list[dict]
    hires_over_time: list[dict]
    insights: list[dict]
