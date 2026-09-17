from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models.job import (
    ApplicationQuestion,
    EmploymentType,
    Job,
    JobSkill,
    JobStatus,
    WorkplaceType,
)
from app.schemas.job import JobCreate, JobUpdate


def _job_relationship_options():
    return (
        selectinload(Job.skills),
        selectinload(Job.application_questions),
    )


def _build_job_skills(job_in: JobCreate | JobUpdate) -> list[JobSkill]:
    if job_in.skills is None:
        return []
    return [
        JobSkill(name=skill.name, skill_type=skill.skill_type)
        for skill in job_in.skills
    ]


def _build_application_questions(
    job_in: JobCreate | JobUpdate,
) -> list[ApplicationQuestion]:
    if job_in.application_questions is None:
        return []
    return [
        ApplicationQuestion(
            question=question.question,
            question_type=question.question_type,
            is_required=question.is_required,
            display_order=question.display_order,
        )
        for question in job_in.application_questions
    ]


def create_job(db: Session, job_in: JobCreate, created_by_id: int) -> Job:
    job_data = job_in.model_dump(exclude={"skills", "application_questions"})
    job = Job(
        **job_data,
        created_by_id=created_by_id,
        skills=_build_job_skills(job_in),
        application_questions=_build_application_questions(job_in),
    )

    try:
        db.add(job)
        db.commit()
        db.refresh(job)
        return get_job_by_id(db, job.id) or job
    except SQLAlchemyError:
        db.rollback()
        raise


def get_job_by_id(db: Session, job_id: int) -> Job | None:
    statement = (
        select(Job)
        .options(*_job_relationship_options())
        .where(Job.id == job_id)
    )
    return db.scalar(statement)


def get_jobs(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: JobStatus | None = None,
    department: str | None = None,
    location: str | None = None,
    employment_type: EmploymentType | None = None,
    workplace_type: WorkplaceType | None = None,
    search: str | None = None,
) -> list[Job]:
    statement = select(Job).options(*_job_relationship_options())

    if status is not None:
        statement = statement.where(Job.status == status)
    if department is not None:
        statement = statement.where(Job.department == department)
    if location is not None:
        statement = statement.where(Job.location == location)
    if employment_type is not None:
        statement = statement.where(Job.employment_type == employment_type)
    if workplace_type is not None:
        statement = statement.where(Job.workplace_type == workplace_type)
    if search:
        search_term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Job.title.ilike(search_term),
                Job.department.ilike(search_term),
                Job.location.ilike(search_term),
            )
        )

    statement = statement.order_by(Job.created_at.desc(), Job.id.desc()).offset(skip).limit(limit)
    return list(db.scalars(statement).all())


def update_job(db: Session, job: Job, job_in: JobUpdate) -> Job:
    update_data = job_in.model_dump(
        exclude_unset=True,
        exclude={"skills", "application_questions"},
    )

    try:
        for field, value in update_data.items():
            setattr(job, field, value)

        if job_in.skills is not None:
            job.skills = _build_job_skills(job_in)
        if job_in.application_questions is not None:
            job.application_questions = _build_application_questions(job_in)

        db.add(job)
        db.commit()
        db.refresh(job)
        return get_job_by_id(db, job.id) or job
    except SQLAlchemyError:
        db.rollback()
        raise


def delete_job(db: Session, job: Job | None) -> bool:
    if job is None:
        return False

    try:
        db.delete(job)
        db.commit()
        return True
    except SQLAlchemyError:
        db.rollback()
        raise
