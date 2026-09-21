from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationResponse, UnreadCountResponse
from app.services.notifications import list_notifications, mark_all_read, mark_notification_read, unread_count

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
def get_notifications(
    unread_only: bool = False,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_notifications(db, current_user.id, unread_only=unread_only, skip=skip, limit=limit)


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return UnreadCountResponse(unread_count=unread_count(db, current_user.id))


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(notification_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notification = mark_notification_read(db, current_user.id, notification_id)
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return notification


@router.post("/mark-all-read")
def mark_all(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    updated = mark_all_read(db, current_user.id)
    return {"updated": updated}
