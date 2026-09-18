from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import require_hr_or_admin
from app.models.application import ApplicationStatus
from app.models.user import User
from app.schemas.hr_application import HRApplicationDetail, HRApplicationListItem, HRApplicationStatusUpdate
from app.services.hr_applications import get_hr_application_detail, list_hr_applications, update_hr_application_status

router = APIRouter(prefix="/hr/applications", tags=["hr applications"])


@router.get("", response_model=list[HRApplicationListItem])
def list_applications_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    job_id: int | None = None,
    status: ApplicationStatus | None = None,
    search: str | None = None,
):
    return list_hr_applications(
        db,
        skip=skip,
        limit=limit,
        job_id=job_id,
        status_filter=status,
        search=search,
    )


@router.get("/{application_id}", response_model=HRApplicationDetail)
def get_application_endpoint(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    application = get_hr_application_detail(db, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application


@router.patch("/{application_id}/status", response_model=HRApplicationDetail)
def update_application_status_endpoint(
    application_id: int,
    status_in: HRApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    application = update_hr_application_status(db, application_id, status_in.status)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application
