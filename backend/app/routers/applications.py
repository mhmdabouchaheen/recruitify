from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import require_roles
from app.models.user import User, UserRole
from app.schemas.application import ApplicationCreate, ApplicationResponse
from app.services.applications import create_application, get_application, get_applications, withdraw_application

router = APIRouter(prefix="/applicant/applications", tags=["applicant applications"])
require_applicant = require_roles([UserRole.APPLICANT])


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def submit_application(
    application_in: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_applicant),
):
    return create_application(db, current_user.id, application_in)


@router.get("", response_model=list[ApplicationResponse])
def list_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_applicant),
):
    return get_applications(db, current_user.id)


@router.get("/{application_id}", response_model=ApplicationResponse)
def read_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_applicant),
):
    application = get_application(db, current_user.id, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application


@router.patch("/{application_id}/withdraw", response_model=ApplicationResponse)
def withdraw_application_endpoint(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_applicant),
):
    application = withdraw_application(db, current_user.id, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application
