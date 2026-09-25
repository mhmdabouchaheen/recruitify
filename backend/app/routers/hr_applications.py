from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import require_hr_or_admin
from app.models.application import ApplicationStatus
from app.models.user import User
from app.schemas.ai_analysis import ApplicationMatchResponse
from app.schemas.hr_application import (
    HRApplicationActivityResponse,
    HRApplicationDetail,
    HRApplicationListItem,
    HRApplicationNoteCreate,
    HRApplicationNoteResponse,
    HRApplicationStatusUpdate,
)
from app.services.ai_analysis import AIProviderError, AIProviderUnavailable
from app.services.candidate_matching import get_stored_application_match, run_application_ai_analysis
from app.services.cv_extraction import CVExtractionError
from app.services.cv_storage import CVStorageError, read_cv_bytes
from app.services.hr_applications import (
    create_application_note,
    get_hr_application,
    get_hr_application_detail,
    list_application_activities,
    list_application_notes,
    list_hr_applications,
    update_hr_application_status,
)

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
    return list_hr_applications(db, skip=skip, limit=limit, job_id=job_id, status_filter=status, search=search)


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


@router.get("/{application_id}/cv")
def download_application_cv_endpoint(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    application = get_hr_application(db, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    if application.cv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    try:
        content = read_cv_bytes(application.cv.stored_filename)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV file not found") from exc
    except CVStorageError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="CV file could not be retrieved") from exc
    filename = application.cv.original_filename or f"application-{application.id}-cv.pdf"
    safe_filename = filename.replace('"', "'").replace("\r", " ").replace("\n", " ")
    return Response(
        content=content,
        media_type=application.cv.content_type or "application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'},
    )


@router.patch("/{application_id}/status", response_model=HRApplicationDetail)
def update_application_status_endpoint(
    application_id: int,
    status_in: HRApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    application = update_hr_application_status(db, application_id, status_in.status, current_user.id, status_in.rejection_feedback)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application


@router.get("/{application_id}/notes", response_model=list[HRApplicationNoteResponse])
def list_notes_endpoint(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    notes = list_application_notes(db, application_id)
    if notes is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return notes


@router.post("/{application_id}/notes", response_model=HRApplicationNoteResponse, status_code=status.HTTP_201_CREATED)
def create_note_endpoint(
    application_id: int,
    note_in: HRApplicationNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    note = create_application_note(db, application_id, current_user.id, note_in.content)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return note


@router.get("/{application_id}/activities", response_model=list[HRApplicationActivityResponse])
def list_activities_endpoint(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    activities = list_application_activities(db, application_id)
    if activities is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return activities


@router.get("/{application_id}/ai-analysis", response_model=ApplicationMatchResponse)
def get_ai_analysis_endpoint(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    match = get_stored_application_match(db, application_id)
    if match is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI analysis has not been run for this application")
    return match


@router.post("/{application_id}/ai-analysis", response_model=ApplicationMatchResponse)
def run_ai_analysis_endpoint(
    application_id: int,
    refresh: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_or_admin),
):
    try:
        match = run_application_ai_analysis(db, application_id, refresh=refresh)
    except CVExtractionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AIProviderUnavailable as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except AIProviderError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI analysis provider could not complete the request") from exc
    if match is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return match

