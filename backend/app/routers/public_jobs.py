from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.job import EmploymentType, JobStatus, WorkplaceType
from app.schemas.job import JobResponse
from app.services.jobs import get_job_by_id, get_jobs


router = APIRouter(prefix="/public/jobs", tags=["public jobs"])


@router.get("", response_model=list[JobResponse])
def list_public_jobs_endpoint(
    db: Session = Depends(get_db),
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    search: str | None = None,
    department: str | None = None,
    location: str | None = None,
    employment_type: EmploymentType | None = None,
    workplace_type: WorkplaceType | None = None,
):
    return get_jobs(
        db,
        skip=skip,
        limit=limit,
        status=JobStatus.PUBLISHED,
        department=department,
        location=location,
        employment_type=employment_type,
        workplace_type=workplace_type,
        search=search,
    )


@router.get("/{job_id}", response_model=JobResponse)
def get_public_job_endpoint(job_id: int, db: Session = Depends(get_db)):
    job = get_job_by_id(db, job_id)
    if job is None or job.status != JobStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    return job
