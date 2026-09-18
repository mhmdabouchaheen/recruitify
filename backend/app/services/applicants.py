from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.applicant import ApplicantProfile, CV
from app.models.user import User
from app.schemas.applicant import ApplicantProfileResponse, ApplicantProfileUpdate

MAX_CV_SIZE_BYTES = 5 * 1024 * 1024
PDF_SIGNATURE = b"%PDF-"
UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "cvs"


def _profile_response(user: User, profile: ApplicantProfile | None) -> ApplicantProfileResponse:
    return ApplicantProfileResponse(
        id=profile.id if profile else None,
        user_id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        phone=profile.phone if profile else None,
        location=profile.location if profile else None,
        professional_title=profile.professional_title if profile else None,
        summary=profile.summary if profile else None,
        linkedin_url=profile.linkedin_url if profile else None,
        github_url=profile.github_url if profile else None,
        created_at=profile.created_at if profile else None,
        updated_at=profile.updated_at if profile else None,
    )


def get_applicant_profile(db: Session, user: User) -> ApplicantProfileResponse:
    profile = db.scalar(select(ApplicantProfile).where(ApplicantProfile.user_id == user.id))
    return _profile_response(user, profile)


def update_applicant_profile(
    db: Session,
    user: User,
    profile_in: ApplicantProfileUpdate,
) -> ApplicantProfileResponse:
    profile = db.scalar(select(ApplicantProfile).where(ApplicantProfile.user_id == user.id))
    if profile is None:
        profile = ApplicantProfile(user_id=user.id)
        db.add(profile)

    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    try:
        db.commit()
        db.refresh(profile)
        return _profile_response(user, profile)
    except SQLAlchemyError:
        db.rollback()
        raise


def list_cvs(db: Session, user_id: int) -> list[CV]:
    statement = select(CV).where(CV.user_id == user_id).order_by(CV.is_primary.desc(), CV.uploaded_at.desc(), CV.id.desc())
    return list(db.scalars(statement).all())


def _safe_extension(filename: str) -> str:
    suffix = Path(filename or "").suffix.lower()
    return ".pdf" if suffix == ".pdf" else ".pdf"


def _stored_filename(user_id: int, original_filename: str) -> str:
    return f"user-{user_id}-{uuid4().hex}{_safe_extension(original_filename)}"


async def read_valid_pdf(upload: UploadFile) -> bytes:
    content = await upload.read(MAX_CV_SIZE_BYTES + 1)
    if len(content) > MAX_CV_SIZE_BYTES:
        raise ValueError("CV file must be 5 MB or smaller")
    if not content.startswith(PDF_SIGNATURE):
        raise ValueError("Only valid PDF files are accepted")
    return content


def create_cv_record(
    db: Session,
    user_id: int,
    original_filename: str,
    content_type: str,
    content: bytes,
) -> CV:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    stored_filename = _stored_filename(user_id, original_filename)
    destination = UPLOAD_ROOT / stored_filename
    destination.write_bytes(content)

    existing_count = db.scalar(select(CV).where(CV.user_id == user_id).limit(1))
    cv = CV(
        user_id=user_id,
        original_filename=Path(original_filename or "cv.pdf").name or "cv.pdf",
        stored_filename=stored_filename,
        content_type=content_type or "application/pdf",
        file_size=len(content),
        is_primary=existing_count is None,
    )

    try:
        db.add(cv)
        db.commit()
        db.refresh(cv)
        return cv
    except SQLAlchemyError:
        db.rollback()
        if destination.exists():
            destination.unlink()
        raise


def delete_cv(db: Session, user_id: int, cv_id: int) -> bool:
    cv = db.get(CV, cv_id)
    if cv is None or cv.user_id != user_id:
        return False

    was_primary = cv.is_primary
    path = UPLOAD_ROOT / cv.stored_filename

    try:
        db.delete(cv)
        db.flush()
        if was_primary:
            next_cv = db.scalar(select(CV).where(CV.user_id == user_id).order_by(CV.uploaded_at.desc(), CV.id.desc()).limit(1))
            if next_cv is not None:
                next_cv.is_primary = True
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise

    if path.exists() and path.is_file() and path.parent == UPLOAD_ROOT:
        path.unlink()
    return True


def set_primary_cv(db: Session, user_id: int, cv_id: int) -> CV | None:
    cv = db.get(CV, cv_id)
    if cv is None or cv.user_id != user_id:
        return None

    try:
        cvs = list(db.scalars(select(CV).where(CV.user_id == user_id)).all())
        for item in cvs:
            item.is_primary = item.id == cv_id
        db.commit()
        db.refresh(cv)
        return cv
    except SQLAlchemyError:
        db.rollback()
        raise
