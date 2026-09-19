from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models.applicant import ApplicantProfile
from app.models.application import Application, ApplicationActivity, ApplicationAnswer, ApplicationNote, ApplicationStatus
from app.models.job import Job
from app.models.ai_analysis import ApplicationMatch
from app.models.contract import Contract
from app.models.user import User
from app.schemas.hr_application import (
    HRApplicantProfileResponse,
    HRApplicantSummary,
    HRApplicationActivityResponse,
    HRApplicationDetail,
    HRApplicationListItem,
    HRApplicationNoteResponse,
)

HR_ALLOWED_STATUSES = {
    ApplicationStatus.APPLIED,
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.INTERVIEW_SCHEDULED,
    ApplicationStatus.INTERVIEW_COMPLETED,
    ApplicationStatus.SELECTED,
    ApplicationStatus.REJECTED,
}


def _detail_options():
    return (
        selectinload(Application.applicant).selectinload(User.applicant_profile),
        selectinload(Application.job).selectinload(Job.skills),
        selectinload(Application.job).selectinload(Job.application_questions),
        selectinload(Application.cv),
        selectinload(Application.answers).selectinload(ApplicationAnswer.question),
    )


def list_hr_applications(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    job_id: int | None = None,
    status_filter: ApplicationStatus | None = None,
    search: str | None = None,
) -> list[HRApplicationListItem]:
    statement = (
        select(Application)
        .join(Application.applicant)
        .join(Application.job)
        .outerjoin(ApplicationMatch, ApplicationMatch.application_id == Application.id)
        .options(selectinload(Application.applicant), selectinload(Application.job))
    )
    if job_id is not None:
        statement = statement.where(Application.job_id == job_id)
    if status_filter is not None:
        statement = statement.where(Application.status == status_filter)
    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(or_(User.first_name.ilike(term), User.last_name.ilike(term), User.email.ilike(term)))
    statement = statement.order_by(Application.submitted_at.desc(), Application.id.desc()).offset(skip).limit(limit)
    applications = list(db.scalars(statement).all())
    if not applications:
        return []
    application_ids = [application.id for application in applications]
    match_rows = db.execute(select(ApplicationMatch.application_id, ApplicationMatch.overall_score).where(ApplicationMatch.application_id.in_(application_ids))).all()
    contract_rows = db.execute(select(Contract.application_id, Contract.status).where(Contract.application_id.in_(application_ids))).all()
    scores = {application_id: overall_score for application_id, overall_score in match_rows}
    contract_statuses = {application_id: contract_status.value for application_id, contract_status in contract_rows}
    return [_to_list_item(application, scores.get(application.id), contract_statuses.get(application.id)) for application in applications]


def get_hr_application(db: Session, application_id: int) -> Application | None:
    statement = select(Application).options(*_detail_options()).where(Application.id == application_id)
    return db.scalar(statement)


def get_hr_application_detail(db: Session, application_id: int) -> HRApplicationDetail | None:
    application = get_hr_application(db, application_id)
    if application is None:
        return None
    return _to_detail(application)


def update_hr_application_status(db: Session, application_id: int, next_status: ApplicationStatus, actor_id: int) -> HRApplicationDetail | None:
    if next_status == ApplicationStatus.WITHDRAWN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="HR cannot set applications to withdrawn")
    if next_status not in HR_ALLOWED_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid application status")

    application = get_hr_application(db, application_id)
    if application is None:
        return None
    if application.status == ApplicationStatus.WITHDRAWN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Withdrawn applications cannot be changed")

    try:
        previous_status = application.status
        application.status = next_status
        db.add(application)
        if previous_status != next_status:
            db.add(ApplicationActivity(application_id=application.id, actor_id=actor_id, event_type="status_changed", from_status=previous_status, to_status=next_status))
        db.commit()
        updated = get_hr_application(db, application_id)
        return _to_detail(updated) if updated else None
    except SQLAlchemyError:
        db.rollback()
        raise


def list_application_notes(db: Session, application_id: int) -> list[HRApplicationNoteResponse] | None:
    if db.get(Application, application_id) is None:
        return None
    statement = (
        select(ApplicationNote)
        .options(selectinload(ApplicationNote.author))
        .where(ApplicationNote.application_id == application_id)
        .order_by(ApplicationNote.created_at.asc(), ApplicationNote.id.asc())
    )
    return [_to_note_response(note) for note in db.scalars(statement).all()]


def create_application_note(db: Session, application_id: int, author_id: int, content: str) -> HRApplicationNoteResponse | None:
    if db.get(Application, application_id) is None:
        return None
    note = ApplicationNote(application_id=application_id, author_id=author_id, content=content.strip())
    try:
        db.add(note)
        db.flush()
        db.add(ApplicationActivity(application_id=application_id, actor_id=author_id, event_type="note_added"))
        db.commit()
        db.refresh(note)
        note = db.scalar(select(ApplicationNote).options(selectinload(ApplicationNote.author)).where(ApplicationNote.id == note.id))
        return _to_note_response(note)
    except SQLAlchemyError:
        db.rollback()
        raise


def list_application_activities(db: Session, application_id: int) -> list[HRApplicationActivityResponse] | None:
    if db.get(Application, application_id) is None:
        return None
    statement = (
        select(ApplicationActivity)
        .options(selectinload(ApplicationActivity.actor))
        .where(ApplicationActivity.application_id == application_id)
        .order_by(ApplicationActivity.created_at.asc(), ApplicationActivity.id.asc())
    )
    return [_to_activity_response(activity) for activity in db.scalars(statement).all()]


def _to_list_item(application: Application, match_score: float | None = None, contract_status: str | None = None) -> HRApplicationListItem:
    return HRApplicationListItem(
        id=application.id,
        status=application.status,
        submitted_at=application.submitted_at,
        applicant_id=application.applicant_id,
        applicant_first_name=application.applicant.first_name,
        applicant_last_name=application.applicant.last_name,
        applicant_email=application.applicant.email,
        job_id=application.job_id,
        job_title=application.job.title,
        department=application.job.department,
        location=application.job.location,
        match_score=match_score,
        contract_status=contract_status,
    )


def _to_detail(application: Application) -> HRApplicationDetail:
    profile: ApplicantProfile | None = application.applicant.applicant_profile
    return HRApplicationDetail(
        id=application.id,
        status=application.status,
        submitted_at=application.submitted_at,
        updated_at=application.updated_at,
        withdrawn_at=application.withdrawn_at,
        applicant=HRApplicantSummary(
            id=application.applicant.id,
            first_name=application.applicant.first_name,
            last_name=application.applicant.last_name,
            email=application.applicant.email,
        ),
        applicant_profile=HRApplicantProfileResponse.model_validate(profile, from_attributes=True) if profile else None,
        job=application.job,
        cv=application.cv,
        answers=application.answers,
    )


def _to_note_response(note: ApplicationNote) -> HRApplicationNoteResponse:
    return HRApplicationNoteResponse(
        id=note.id,
        application_id=note.application_id,
        content=note.content,
        created_at=note.created_at,
        updated_at=note.updated_at,
        author_id=note.author_id,
        author_first_name=note.author.first_name,
        author_last_name=note.author.last_name,
    )


def _to_activity_response(activity: ApplicationActivity) -> HRApplicationActivityResponse:
    actor = activity.actor
    return HRApplicationActivityResponse(
        id=activity.id,
        application_id=activity.application_id,
        actor_id=activity.actor_id,
        actor_first_name=actor.first_name if actor else None,
        actor_last_name=actor.last_name if actor else None,
        event_type=activity.event_type,
        from_status=activity.from_status,
        to_status=activity.to_status,
        created_at=activity.created_at,
    )
