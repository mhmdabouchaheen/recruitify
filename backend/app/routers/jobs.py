from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import require_authenticated_user, require_hr_or_admin
from app.models.job import EmploymentType, JobStatus, WorkplaceType
from app.models.user import User
from app.schemas.job import JobCreate, JobResponse, JobUpdate
from app.services.jobs import create_job, delete_job, get_job_by_id, get_jobs, update_job


router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job_endpoint(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    return create_job(db, job_in, created_by_id=current_user.id)


@router.get("", response_model=list[JobResponse])
def list_jobs_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    search: str | None = None,
    status: JobStatus | None = None,
    department: str | None = None,
    location: str | None = None,
    employment_type: EmploymentType | None = None,
    workplace_type: WorkplaceType | None = None,
):
    return get_jobs(
        db,
        skip=skip,
        limit=limit,
        status=status,
        department=department,
        location=location,
        employment_type=employment_type,
        workplace_type=workplace_type,
        search=search,
    )


@router.get("/{job_id}", response_model=JobResponse)
def get_job_endpoint(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user),
):
    job = get_job_by_id(db, job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    return job


@router.patch("/{job_id}", response_model=JobResponse)
def update_job_endpoint(
    job_id: int,
    job_in: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    job = get_job_by_id(db, job_id)
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    return update_job(db, job, job_in)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_endpoint(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    job = get_job_by_id(db, job_id)
    if not delete_job(db, job):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
