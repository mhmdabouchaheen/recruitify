from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models.applicant import ApplicantProfile
from app.models.application import Application, ApplicationAnswer, ApplicationStatus
from app.models.job import Job
from app.models.user import User
from app.schemas.hr_application import (
    HRApplicantProfileResponse,
    HRApplicantSummary,
    HRApplicationDetail,
    HRApplicationListItem,
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
        .options(selectinload(Application.applicant), selectinload(Application.job))
    )
    if job_id is not None:
        statement = statement.where(Application.job_id == job_id)
    if status_filter is not None:
        statement = statement.where(Application.status == status_filter)
    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                User.first_name.ilike(term),
                User.last_name.ilike(term),
                User.email.ilike(term),
            )
        )
    statement = statement.order_by(Application.submitted_at.desc(), Application.id.desc()).offset(skip).limit(limit)
    return [_to_list_item(application) for application in db.scalars(statement).all()]


def get_hr_application(db: Session, application_id: int) -> Application | None:
    statement = select(Application).options(*_detail_options()).where(Application.id == application_id)
    return db.scalar(statement)


def get_hr_application_detail(db: Session, application_id: int) -> HRApplicationDetail | None:
    application = get_hr_application(db, application_id)
    if application is None:
        return None
    return _to_detail(application)


def update_hr_application_status(
    db: Session,
    application_id: int,
    next_status: ApplicationStatus,
) -> HRApplicationDetail | None:
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
        application.status = next_status
        db.add(application)
        db.commit()
        updated = get_hr_application(db, application_id)
        return _to_detail(updated) if updated else None
    except SQLAlchemyError:
        db.rollback()
        raise


def _to_list_item(application: Application) -> HRApplicationListItem:
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
