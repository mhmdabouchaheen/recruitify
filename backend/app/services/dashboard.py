from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, selectinload

from app.models.application import Application, ApplicationActivity, ApplicationStatus
from app.models.contract import Contract, ContractStatus
from app.models.interview import Interview, InterviewInterviewer, InterviewStatus
from app.models.job import Job, JobStatus
from app.schemas.dashboard import (
    DashboardActivityItem,
    DashboardAttentionItem,
    DashboardInterviewItem,
    DashboardJobItem,
    DashboardMetrics,
    DashboardRecentApplicationItem,
    DashboardStatusItem,
    DashboardTimeSeriesItem,
    DashboardOutcomes,
    DashboardPipeline,
    HRDashboardResponse,
)

PIPELINE_STATUSES = [
    ApplicationStatus.APPLIED,
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.INTERVIEW_SCHEDULED,
    ApplicationStatus.INTERVIEW_COMPLETED,
    ApplicationStatus.SELECTED,
    ApplicationStatus.REJECTED,
]


def get_hr_dashboard(db: Session) -> HRDashboardResponse:
    now = datetime.now(timezone.utc)
    active_jobs = db.scalar(select(func.count()).select_from(Job).where(Job.status == JobStatus.PUBLISHED)) or 0
    total_candidates = db.scalar(select(func.count()).select_from(Application)) or 0
    upcoming_interviews_count = db.scalar(
        select(func.count()).select_from(Interview).where(
            Interview.status == InterviewStatus.SCHEDULED,
            Interview.scheduled_at >= now,
        )
    ) or 0
    hired = db.scalar(
        select(func.count()).select_from(Application).join(Contract).where(
            Application.status == ApplicationStatus.SELECTED,
            Contract.status == ContractStatus.ACCEPTED,
        )
    ) or 0
    pipeline_counts = _pipeline_counts(db)
    rejected = pipeline_counts.get(ApplicationStatus.REJECTED.value, 0)
    selected = pipeline_counts.get(ApplicationStatus.SELECTED.value, 0)
    active_candidates = db.scalar(
        select(func.count()).select_from(Application).where(
            Application.status.notin_([ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN])
        )
    ) or 0
    return HRDashboardResponse(
        metrics=DashboardMetrics(active_jobs=active_jobs, total_candidates=total_candidates, upcoming_interviews=upcoming_interviews_count, hired=hired),
        pipeline=DashboardPipeline(
            applied=pipeline_counts.get(ApplicationStatus.APPLIED.value, 0),
            under_review=pipeline_counts.get(ApplicationStatus.UNDER_REVIEW.value, 0),
            shortlisted=pipeline_counts.get(ApplicationStatus.SHORTLISTED.value, 0),
            interview_scheduled=pipeline_counts.get(ApplicationStatus.INTERVIEW_SCHEDULED.value, 0),
            interview_completed=pipeline_counts.get(ApplicationStatus.INTERVIEW_COMPLETED.value, 0),
            selected=selected,
            rejected=rejected,
        ),
        outcomes=DashboardOutcomes(active_candidates=active_candidates, selected=selected, hired=hired, rejected=rejected),
        upcoming_interviews=_upcoming_interviews(db, now),
        recent_activity=_recent_activity(db),
        recent_jobs=_recent_jobs(db),
        needs_attention=_needs_attention(db),
        applications_over_time=_applications_over_time(db),
        applications_by_status=_applications_by_status(db, total_candidates),
        recent_applications=_recent_applications(db),
    )


def _pipeline_counts(db: Session) -> dict[str, int]:
    rows = db.execute(select(Application.status, func.count(Application.id)).where(Application.status.in_(PIPELINE_STATUSES)).group_by(Application.status)).all()
    return {status.value: count for status, count in rows}


def _upcoming_interviews(db: Session, now: datetime) -> list[DashboardInterviewItem]:
    interviews = list(db.scalars(
        select(Interview)
        .options(
            selectinload(Interview.application).selectinload(Application.applicant),
            selectinload(Interview.application).selectinload(Application.job),
            selectinload(Interview.interviewers).selectinload(InterviewInterviewer.interviewer),
        )
        .where(Interview.status == InterviewStatus.SCHEDULED, Interview.scheduled_at >= now)
        .order_by(Interview.scheduled_at.asc(), Interview.id.asc())
        .limit(5)
    ).all())
    return [DashboardInterviewItem(
        id=interview.id,
        application_id=interview.application_id,
        candidate_name=f"{interview.application.applicant.first_name} {interview.application.applicant.last_name}",
        job_title=interview.application.job.title,
        scheduled_at=interview.scheduled_at,
        interview_type=interview.interview_type.value,
        duration_minutes=interview.duration_minutes,
        interviewers=[f"{item.interviewer.first_name} {item.interviewer.last_name}" for item in interview.interviewers],
    ) for interview in interviews]


def _recent_activity(db: Session) -> list[DashboardActivityItem]:
    activities = list(db.scalars(
        select(ApplicationActivity)
        .options(
            selectinload(ApplicationActivity.application).selectinload(Application.applicant),
            selectinload(ApplicationActivity.application).selectinload(Application.job),
        )
        .order_by(ApplicationActivity.created_at.desc(), ApplicationActivity.id.desc())
        .limit(8)
    ).all())
    return [_activity_item(activity) for activity in activities]


def _recent_jobs(db: Session) -> list[DashboardJobItem]:
    application_count = func.count(Application.id)
    active_count = func.coalesce(func.sum(case((Application.status.notin_([ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN]), 1), else_=0)), 0)
    rows = db.execute(
        select(Job, application_count.label("application_count"), active_count.label("active_count"))
        .outerjoin(Application, Application.job_id == Job.id)
        .group_by(Job.id)
        .order_by(Job.created_at.desc(), Job.id.desc())
        .limit(5)
    ).all()
    return [DashboardJobItem(id=job.id, title=job.title, department=job.department, status=job.status.value, application_count=int(total or 0), active_application_count=int(active or 0)) for job, total, active in rows]


def _needs_attention(db: Session) -> list[DashboardAttentionItem]:
    under_review = db.scalar(select(func.count()).select_from(Application).where(Application.status == ApplicationStatus.UNDER_REVIEW)) or 0
    shortlisted = db.scalar(select(func.count()).select_from(Application).where(Application.status == ApplicationStatus.SHORTLISTED)) or 0
    selected_without_contract = db.scalar(select(func.count()).select_from(Application).outerjoin(Contract).where(Application.status == ApplicationStatus.SELECTED, Contract.id.is_(None))) or 0
    sent_contracts = db.scalar(select(func.count()).select_from(Contract).where(Contract.status == ContractStatus.SENT)) or 0
    items: list[DashboardAttentionItem] = []
    if under_review:
        items.append(DashboardAttentionItem(title="Applications under review", detail="Candidates are waiting for HR review.", count=under_review, link="/pipeline"))
    if shortlisted:
        items.append(DashboardAttentionItem(title="Shortlisted candidates", detail="Schedule interviews for shortlisted candidates.", count=shortlisted, link="/pipeline"))
    if selected_without_contract:
        items.append(DashboardAttentionItem(title="Selected without contract", detail="Prepare contract drafts for selected candidates.", count=selected_without_contract, link="/pipeline"))
    if sent_contracts:
        items.append(DashboardAttentionItem(title="Contracts awaiting response", detail="Sent offers are waiting for applicant response.", count=sent_contracts, link="/pipeline"))
    return items[:4]


def _activity_item(activity: ApplicationActivity) -> DashboardActivityItem:
    application = activity.application
    return DashboardActivityItem(
        id=activity.id,
        application_id=activity.application_id,
        event_type=activity.event_type,
        title=_activity_title(activity.event_type),
        description=_activity_description(activity),
        candidate_name=f"{application.applicant.first_name} {application.applicant.last_name}",
        job_title=application.job.title,
        created_at=activity.created_at,
    )


def _activity_title(event_type: str) -> str:
    titles = {
        "application_submitted": "Application submitted",
        "status_changed": "Status changed",
        "note_added": "HR note added",
        "contract_created": "Contract prepared",
        "contract_updated": "Contract updated",
        "contract_pdf_generated": "Contract PDF generated",
        "contract_sent": "Contract sent",
        "contract_accepted": "Contract accepted",
        "contract_declined": "Contract declined",
    }
    return titles.get(event_type, event_type.replace("_", " ").title())


def _activity_description(activity: ApplicationActivity) -> str:
    if activity.event_type == "status_changed" and activity.from_status and activity.to_status:
        return f"{_format_status(activity.from_status.value)} to {_format_status(activity.to_status.value)}"
    return _activity_title(activity.event_type)


def _format_status(value: str) -> str:
    return value.replace("_", " ").title()



def _period_key(value: datetime) -> str:
    return value.strftime("%b %d")


def _applications_over_time(db: Session) -> list[DashboardTimeSeriesItem]:
    applications = list(db.scalars(
        select(Application).order_by(Application.submitted_at.asc(), Application.id.asc())
    ).all())
    contracts = list(db.scalars(
        select(Contract).where(Contract.status == ContractStatus.ACCEPTED)
    ).all())
    selected_ids = {
        application.id
        for application in applications
        if application.status == ApplicationStatus.SELECTED
    }
    periods: dict[str, dict[str, int | str]] = defaultdict(
        lambda: {"period": "", "applications": 0, "hires": 0}
    )

    for application in applications:
        key = _period_key(application.submitted_at)
        periods[key]["period"] = key
        periods[key]["applications"] = int(periods[key]["applications"]) + 1

    for contract in contracts:
        if contract.application_id not in selected_ids:
            continue
        timestamp = contract.responded_at or contract.updated_at or contract.created_at
        key = _period_key(timestamp)
        periods[key]["period"] = key
        periods[key]["hires"] = int(periods[key]["hires"]) + 1

    def sort_key(item: dict[str, int | str]) -> datetime:
        return datetime.strptime(str(item["period"]), "%b %d")

    return [
        DashboardTimeSeriesItem(**item)
        for item in sorted(periods.values(), key=sort_key)
    ]


def _applications_by_status(db: Session, total: int) -> list[DashboardStatusItem]:
    counts = _pipeline_counts(db)
    ordered_statuses = [
        (ApplicationStatus.APPLIED.value, "Applied"),
        (ApplicationStatus.UNDER_REVIEW.value, "Under Review"),
        (ApplicationStatus.SHORTLISTED.value, "Shortlisted"),
        (ApplicationStatus.INTERVIEW_SCHEDULED.value, "Interview Scheduled"),
        (ApplicationStatus.INTERVIEW_COMPLETED.value, "Interview Completed"),
        (ApplicationStatus.SELECTED.value, "Selected"),
        (ApplicationStatus.REJECTED.value, "Rejected"),
    ]
    return [
        DashboardStatusItem(
            status=status,
            label=label,
            count=counts.get(status, 0),
            percentage=round((counts.get(status, 0) / total) * 100, 1) if total else 0,
        )
        for status, label in ordered_statuses
        if counts.get(status, 0)
    ]


def _recent_applications(db: Session) -> list[DashboardRecentApplicationItem]:
    applications = list(db.scalars(
        select(Application)
        .options(selectinload(Application.applicant), selectinload(Application.job))
        .order_by(Application.submitted_at.desc(), Application.id.desc())
        .limit(5)
    ).all())
    return [
        DashboardRecentApplicationItem(
            id=application.id,
            candidate_name=f"{application.applicant.first_name} {application.applicant.last_name}",
            candidate_email=application.applicant.email,
            job_title=application.job.title,
            status=application.status.value,
            submitted_at=application.submitted_at,
        )
        for application in applications
    ]
