from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import require_roles
from app.models.user import User, UserRole
from app.schemas.applicant import ApplicantProfileResponse, ApplicantProfileUpdate, CVReplacementRequest, CVReplacementResponse, CVResponse
from app.services.applicants import (
    create_cv_record,
    delete_cv,
    get_applicant_profile,
    list_cvs,
    read_valid_pdf,
    replace_cv_in_applications,
    set_primary_cv,
    update_applicant_profile,
)


router = APIRouter(prefix="/applicant", tags=["applicant"])
require_applicant = require_roles([UserRole.APPLICANT])


@router.get("/profile", response_model=ApplicantProfileResponse)
def read_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_applicant),
):
    return get_applicant_profile(db, current_user)


@router.patch("/profile", response_model=ApplicantProfileResponse)
def update_profile(
    profile_in: ApplicantProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_applicant),
):
    return update_applicant_profile(db, current_user, profile_in)


@router.get("/cvs", response_model=list[CVResponse])
def read_cvs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_applicant),
):
    return list_cvs(db, current_user.id)


@router.post("/cvs", response_model=CVResponse, status_code=status.HTTP_201_CREATED)
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_applicant),
):
    if file.content_type not in {"application/pdf", "application/x-pdf"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted",
        )

    try:
        content = await read_valid_pdf(file)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return create_cv_record(
        db,
        user_id=current_user.id,
        original_filename=file.filename or "cv.pdf",
        content_type="application/pdf",
        content=content,
    )


@router.delete("/cvs/{cv_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_cv(
    cv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_applicant),
):
    if not delete_cv(db, current_user.id, cv_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    return None


@router.patch("/cvs/{cv_id}/replace", response_model=CVReplacementResponse)
def replace_cv_references(
    cv_id: int,
    replacement_in: CVReplacementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_applicant),
):
    result = replace_cv_in_applications(
        db,
        user_id=current_user.id,
        cv_id=cv_id,
        replacement_cv_id=replacement_in.replacement_cv_id,
    )
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    return result


@router.patch("/cvs/{cv_id}/primary", response_model=CVResponse)
def mark_primary_cv(
    cv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_applicant),
):
    cv = set_primary_cv(db, current_user.id, cv_id)
    if cv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    return cv
