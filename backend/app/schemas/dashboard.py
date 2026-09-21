from datetime import datetime
from pydantic import BaseModel


class DashboardMetrics(BaseModel):
    active_jobs: int
    total_candidates: int
    upcoming_interviews: int
    hired: int


class DashboardPipeline(BaseModel):
    applied: int
    under_review: int
    shortlisted: int
    interview_scheduled: int
    interview_completed: int
    selected: int
    rejected: int


class DashboardOutcomes(BaseModel):
    active_candidates: int
    selected: int
    hired: int
    rejected: int


class DashboardInterviewItem(BaseModel):
    id: int
    application_id: int
    candidate_name: str
    job_title: str
    scheduled_at: datetime
    interview_type: str
    duration_minutes: int
    interviewers: list[str]


class DashboardActivityItem(BaseModel):
    id: int
    application_id: int
    event_type: str
    title: str
    description: str
    candidate_name: str
    job_title: str
    created_at: datetime


class DashboardJobItem(BaseModel):
    id: int
    title: str
    department: str
    status: str
    application_count: int
    active_application_count: int


class DashboardAttentionItem(BaseModel):
    title: str
    detail: str
    count: int
    link: str


class HRDashboardResponse(BaseModel):
    metrics: DashboardMetrics
    pipeline: DashboardPipeline
    outcomes: DashboardOutcomes
    upcoming_interviews: list[DashboardInterviewItem]
    recent_activity: list[DashboardActivityItem]
    recent_jobs: list[DashboardJobItem]
    needs_attention: list[DashboardAttentionItem]
