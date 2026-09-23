
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, time, timezone
from math import floor

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.ai_analysis import ApplicationMatch
from app.models.application import Application, ApplicationStatus
from app.models.contract import Contract, ContractStatus
from app.models.interview import Interview, InterviewEvaluation, InterviewRecommendation
from app.models.job import EmploymentType, Job, WorkplaceType
from app.schemas.reports import RecruitmentReportsResponse, ReportsFilters, ReportOption

FUNNEL_STAGES = [
    (ApplicationStatus.APPLIED, "Applied"),
    (ApplicationStatus.UNDER_REVIEW, "Under Review"),
    (ApplicationStatus.SHORTLISTED, "Shortlisted"),
    (ApplicationStatus.INTERVIEW_SCHEDULED, "Interview Scheduled"),
    (ApplicationStatus.INTERVIEW_COMPLETED, "Interviewed"),
    (ApplicationStatus.SELECTED, "Selected"),
]
STATUS_ORDER = [status.value for status in ApplicationStatus]
STATUS_LABELS = {status.value: status.value.replace("_", " ").title() for status in ApplicationStatus}


def get_recruitment_reports(
    db: Session,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
    job_id: int | None = None,
    department: str | None = None,
    status: ApplicationStatus | None = None,
    employment_type: EmploymentType | None = None,
    workplace_type: WorkplaceType | None = None,
) -> RecruitmentReportsResponse:
    jobs = list(db.scalars(select(Job).order_by(Job.title.asc(), Job.id.asc())).all())
    applications = _filtered_applications(db, start_date, end_date, job_id, department, status, employment_type, workplace_type)
    app_ids = [application.id for application in applications]
    matches = _matches_by_application(db, app_ids)
    contracts = _contracts_for_applications(db, app_ids)
    hired_application_ids = _hired_application_ids(applications, contracts)

    funnel = _funnel(applications, hired_application_ids)
    status_data = _applications_by_status(applications)
    department_data = _applications_by_department(applications)
    over_time = _applications_over_time(applications, contracts, hired_application_ids)
    hires_over_time = _hires_over_time(contracts, hired_application_ids)
    job_performance = _job_performance(applications, matches, hired_application_ids)
    ai_match = _ai_match(matches)
    interview_outcomes = _interview_outcomes(db, app_ids)
    contract_outcomes = _contract_outcomes(contracts)

    return RecruitmentReportsResponse(
        filters=ReportsFilters(
            jobs=[ReportOption(value=str(job.id), label=job.title) for job in jobs],
            departments=sorted({job.department for job in jobs if job.department}),
            statuses=[status.value for status in ApplicationStatus],
        ),
        funnel=funnel,
        applications_over_time=over_time,
        applications_by_status=status_data,
        job_performance=job_performance,
        applications_by_department=department_data,
        ai_match=ai_match,
        interview_outcomes=interview_outcomes,
        contract_outcomes=contract_outcomes,
        hires_over_time=hires_over_time,
        insights=_insights(department_data, ai_match, contract_outcomes, funnel),
    )


def _filtered_applications(db: Session, start_date, end_date, job_id, department, status, employment_type, workplace_type) -> list[Application]:
    query = select(Application).options(selectinload(Application.job), selectinload(Application.contract))
    if start_date:
        query = query.where(Application.submitted_at >= datetime.combine(start_date, time.min, tzinfo=timezone.utc))
    if end_date:
        query = query.where(Application.submitted_at <= datetime.combine(end_date, time.max, tzinfo=timezone.utc))
    if status:
        query = query.where(Application.status == status)
    if job_id or department or employment_type or workplace_type:
        query = query.join(Application.job)
    if job_id:
        query = query.where(Application.job_id == job_id)
    if department:
        query = query.where(Job.department == department)
    if employment_type:
        query = query.where(Job.employment_type == employment_type)
    if workplace_type:
        query = query.where(Job.workplace_type == workplace_type)
    return list(db.scalars(query.order_by(Application.submitted_at.asc(), Application.id.asc())).all())


def _matches_by_application(db: Session, app_ids: list[int]) -> dict[int, ApplicationMatch]:
    if not app_ids:
        return {}
    rows = db.scalars(select(ApplicationMatch).where(ApplicationMatch.application_id.in_(app_ids))).all()
    return {match.application_id: match for match in rows}


def _contracts_for_applications(db: Session, app_ids: list[int]) -> list[Contract]:
    if not app_ids:
        return []
    return list(db.scalars(select(Contract).where(Contract.application_id.in_(app_ids))).all())


def _hired_application_ids(applications: list[Application], contracts: list[Contract]) -> set[int]:
    selected_ids = {application.id for application in applications if application.status == ApplicationStatus.SELECTED}
    return {contract.application_id for contract in contracts if contract.status == ContractStatus.ACCEPTED and contract.application_id in selected_ids}


def _funnel(applications: list[Application], hired_ids: set[int]) -> dict:
    counts = Counter(application.status.value for application in applications)
    stages = [{"key": key.value, "label": label, "count": counts.get(key.value, 0)} for key, label in FUNNEL_STAGES]
    stages.append({"key": "hired", "label": "Hired", "count": len(hired_ids)})
    conversions = []
    for previous, current in zip(stages, stages[1:]):
        rate = round((current["count"] / previous["count"]) * 100, 1) if previous["count"] else 0
        conversions.append({"from": previous["key"], "to": current["key"], "rate": rate})
    applied = stages[0]["count"]
    overall = round((len(hired_ids) / applied) * 100, 1) if applied else 0
    return {"stages": stages, "conversions": conversions, "overall_conversion": overall, "hired_count": len(hired_ids)}


def _applications_by_status(applications: list[Application]) -> list[dict]:
    counts = Counter(application.status.value for application in applications)
    total = len(applications)
    return [{"status": key, "label": STATUS_LABELS[key], "count": counts.get(key, 0), "percentage": round((counts.get(key, 0) / total) * 100, 1) if total else 0} for key in STATUS_ORDER if counts.get(key, 0)]


def _applications_by_department(applications: list[Application]) -> list[dict]:
    counts = Counter(application.job.department for application in applications if application.job)
    return [{"department": department, "count": count} for department, count in counts.most_common()]


def _period_key(value: datetime) -> str:
    return value.strftime("%b %Y")


def _applications_over_time(applications: list[Application], contracts: list[Contract], hired_ids: set[int]) -> list[dict]:
    periods: dict[str, dict] = defaultdict(lambda: {"period": "", "applications": 0, "hires": 0})
    for application in applications:
        key = _period_key(application.submitted_at)
        periods[key]["period"] = key
        periods[key]["applications"] += 1
    for contract in contracts:
        if contract.application_id in hired_ids:
            timestamp = contract.responded_at or contract.updated_at or contract.created_at
            key = _period_key(timestamp)
            periods[key]["period"] = key
            periods[key]["hires"] += 1
    return sorted(periods.values(), key=lambda item: datetime.strptime(item["period"], "%b %Y"))


def _hires_over_time(contracts: list[Contract], hired_ids: set[int]) -> list[dict]:
    counts: dict[str, int] = defaultdict(int)
    for contract in contracts:
        if contract.application_id in hired_ids:
            timestamp = contract.responded_at or contract.updated_at or contract.created_at
            counts[_period_key(timestamp)] += 1
    return [{"period": key, "hires": value} for key, value in sorted(counts.items(), key=lambda item: datetime.strptime(item[0], "%b %Y"))]


def _job_performance(applications: list[Application], matches: dict[int, ApplicationMatch], hired_ids: set[int]) -> list[dict]:
    grouped: dict[int, list[Application]] = defaultdict(list)
    for application in applications:
        grouped[application.job_id].append(application)
    rows = []
    for job_apps in grouped.values():
        job = job_apps[0].job
        scores = [matches[application.id].overall_score for application in job_apps if application.id in matches]
        rows.append({
            "job_id": job.id,
            "title": job.title,
            "applicants": len(job_apps),
            "shortlisted": sum(1 for app in job_apps if app.status == ApplicationStatus.SHORTLISTED),
            "interviewed": sum(1 for app in job_apps if app.status in [ApplicationStatus.INTERVIEW_SCHEDULED, ApplicationStatus.INTERVIEW_COMPLETED]),
            "hired": sum(1 for app in job_apps if app.id in hired_ids),
            "avg_ai_match": round(sum(scores) / len(scores), 1) if scores else None,
        })
    return sorted(rows, key=lambda row: row["applicants"], reverse=True)[:8]


def _ai_match(matches: dict[int, ApplicationMatch]) -> dict:
    buckets = [
        {"label": "< 40%", "min": 0, "max": 39.999, "count": 0},
        {"label": "40?59%", "min": 40, "max": 59.999, "count": 0},
        {"label": "60?79%", "min": 60, "max": 79.999, "count": 0},
        {"label": "80%+", "min": 80, "max": 100, "count": 0},
    ]
    scores = [match.overall_score for match in matches.values()]
    for score in scores:
        for bucket in buckets:
            if bucket["min"] <= score <= bucket["max"]:
                bucket["count"] += 1
                break
    return {"average": round(sum(scores) / len(scores), 1) if scores else None, "total_scored": len(scores), "buckets": [{"label": b["label"], "count": b["count"]} for b in buckets]}


def _interview_outcomes(db: Session, app_ids: list[int]) -> dict:
    if not app_ids:
        return {"total": 0, "items": []}
    evaluations = list(db.scalars(
        select(InterviewEvaluation)
        .join(Interview, InterviewEvaluation.interview_id == Interview.id)
        .where(Interview.application_id.in_(app_ids))
    ).all())
    counts = Counter(evaluation.recommendation.value for evaluation in evaluations)
    total = len(evaluations)
    order = [value.value for value in InterviewRecommendation]
    return {"total": total, "items": [{"status": key, "label": key.replace("_", " ").title(), "count": counts.get(key, 0), "percentage": round((counts.get(key, 0) / total) * 100, 1) if total else 0} for key in order if counts.get(key, 0)]}


def _contract_outcomes(contracts: list[Contract]) -> list[dict]:
    counts = Counter(contract.status.value for contract in contracts)
    total = len(contracts)
    return [{"status": status.value, "label": status.value.title(), "count": counts.get(status.value, 0), "percentage": round((counts.get(status.value, 0) / total) * 100, 1) if total else 0} for status in ContractStatus if counts.get(status.value, 0)]


def _insights(department_data: list[dict], ai_match: dict, contract_outcomes: list[dict], funnel: dict) -> list[dict]:
    insights = []
    if department_data:
        top = department_data[0]
        insights.append({"title": f"{top['department']} has the highest application volume", "description": f"{top['count']} applications are for {top['department']} roles."})
    if ai_match["total_scored"]:
        top_bucket = max(ai_match["buckets"], key=lambda bucket: bucket["count"])
        if top_bucket["count"]:
            insights.append({"title": f"Most AI match scores are in {top_bucket['label']}", "description": f"{top_bucket['count']} scored applications fall in this range."})
    accepted = next((item for item in contract_outcomes if item["status"] == ContractStatus.ACCEPTED.value), None)
    sent_total = sum(item["count"] for item in contract_outcomes if item["status"] in [ContractStatus.SENT.value, ContractStatus.ACCEPTED.value, ContractStatus.DECLINED.value])
    if accepted and sent_total:
        insights.append({"title": f"{accepted['count']} of {sent_total} sent contracts accepted", "description": f"Accepted offers represent {accepted['percentage']}% of current contract outcomes."})
    if not insights and funnel["stages"][0]["count"]:
        insights.append({"title": "Applications are being tracked", "description": f"{funnel['stages'][0]['count']} applications are included in this report."})
    return insights[:3]
