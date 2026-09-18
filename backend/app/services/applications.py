from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models.applicant import CV
from app.models.application import Application, ApplicationActivity, ApplicationAnswer, ApplicationStatus
from app.models.job import ApplicationQuestion, Job, JobStatus
from app.schemas.application import ApplicationCreate

TERMINAL_WITHDRAW_BLOCKED = {
    ApplicationStatus.SELECTED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
}


def _load_options():
    return (
        selectinload(Application.job).selectinload(Job.skills),
        selectinload(Application.job).selectinload(Job.application_questions),
        selectinload(Application.cv),
        selectinload(Application.answers).selectinload(ApplicationAnswer.question),
    )


def get_applications(db: Session, applicant_id: int) -> list[Application]:
    statement = (
        select(Application)
        .options(*_load_options())
        .where(Application.applicant_id == applicant_id)
        .order_by(Application.submitted_at.desc(), Application.id.desc())
    )
    return list(db.scalars(statement).all())


def get_application(db: Session, applicant_id: int, application_id: int) -> Application | None:
    statement = (
        select(Application)
        .options(*_load_options())
        .where(Application.id == application_id, Application.applicant_id == applicant_id)
    )
    return db.scalar(statement)


def create_application(db: Session, applicant_id: int, application_in: ApplicationCreate) -> Application:
    job = db.scalar(
        select(Job)
        .options(selectinload(Job.application_questions), selectinload(Job.skills))
        .where(Job.id == application_in.job_id)
    )
    if job is None or job.status != JobStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Published job not found")

    cv = db.get(CV, application_in.cv_id)
    if cv is None or cv.user_id != applicant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected CV is not available")

    if db.scalar(select(Application.id).where(Application.applicant_id == applicant_id, Application.job_id == job.id)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already applied to this job")

    questions_by_id = {question.id: question for question in job.application_questions}
    answer_ids = [answer.question_id for answer in application_in.answers]
    if len(answer_ids) != len(set(answer_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate question answers are not allowed")
    invalid_ids = [question_id for question_id in answer_ids if question_id not in questions_by_id]
    if invalid_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Answers must match this job's questions")

    answered_required = {answer.question_id for answer in application_in.answers if answer.answer.strip()}
    missing_required = [question.id for question in job.application_questions if question.is_required and question.id not in answered_required]
    if missing_required:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Required questions must be answered")

    application = Application(applicant_id=applicant_id, job_id=job.id, cv_id=cv.id, status=ApplicationStatus.APPLIED)
    application.answers = [
        ApplicationAnswer(question_id=answer.question_id, answer=answer.answer.strip())
        for answer in application_in.answers
    ]

    try:
        db.add(application)
        db.flush()
        db.add(ApplicationActivity(application_id=application.id, actor_id=applicant_id, event_type="application_submitted", to_status=ApplicationStatus.APPLIED))
        db.commit()
        return get_application(db, applicant_id, application.id) or application
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already applied to this job") from exc
    except SQLAlchemyError:
        db.rollback()
        raise


def withdraw_application(db: Session, applicant_id: int, application_id: int) -> Application | None:
    application = get_application(db, applicant_id, application_id)
    if application is None:
        return None
    if application.status in TERMINAL_WITHDRAW_BLOCKED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This application cannot be withdrawn")

    try:
        application.status = ApplicationStatus.WITHDRAWN
        application.withdrawn_at = datetime.now(timezone.utc)
        db.add(application)
        db.commit()
        return get_application(db, applicant_id, application.id) or application
    except SQLAlchemyError:
        db.rollback()
        raise

