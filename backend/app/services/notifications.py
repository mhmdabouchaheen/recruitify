from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType
from app.schemas.notification import NotificationResponse


def create_notification(
    db: Session,
    *,
    user_id: int,
    type: NotificationType,
    title: str,
    message: str,
    related_application_id: int | None = None,
    related_interview_id: int | None = None,
    related_job_id: int | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        related_application_id=related_application_id,
        related_interview_id=related_interview_id,
        related_job_id=related_job_id,
    )
    db.add(notification)
    return notification


def list_notifications(db: Session, user_id: int, *, unread_only: bool = False, skip: int = 0, limit: int = 50) -> list[NotificationResponse]:
    statement = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        statement = statement.where(Notification.is_read.is_(False))
    statement = statement.order_by(Notification.created_at.desc(), Notification.id.desc()).offset(skip).limit(limit)
    return [NotificationResponse.model_validate(item, from_attributes=True) for item in db.scalars(statement).all()]


def unread_count(db: Session, user_id: int) -> int:
    return db.scalar(select(func.count()).select_from(Notification).where(Notification.user_id == user_id, Notification.is_read.is_(False))) or 0


def mark_notification_read(db: Session, user_id: int, notification_id: int) -> NotificationResponse | None:
    notification = db.scalar(select(Notification).where(Notification.id == notification_id, Notification.user_id == user_id))
    if notification is None:
        return None
    if not notification.is_read:
        notification.is_read = True
        db.add(notification)
        db.commit()
        db.refresh(notification)
    return NotificationResponse.model_validate(notification, from_attributes=True)


def mark_all_read(db: Session, user_id: int) -> int:
    result = db.execute(update(Notification).where(Notification.user_id == user_id, Notification.is_read.is_(False)).values(is_read=True))
    db.commit()
    return result.rowcount or 0


def notify_hr_admins(
    db: Session,
    *,
    type: NotificationType,
    title: str,
    message: str,
    actor_id: int | None = None,
    related_application_id: int | None = None,
    related_interview_id: int | None = None,
    related_job_id: int | None = None,
) -> None:
    from app.models.user import User, UserRole

    users = db.scalars(select(User).where(User.role.in_([UserRole.HR, UserRole.ADMIN]), User.is_active.is_(True))).all()
    for user in users:
        if actor_id is not None and user.id == actor_id:
            continue
        create_notification(
            db,
            user_id=user.id,
            type=type,
            title=title,
            message=message,
            related_application_id=related_application_id,
            related_interview_id=related_interview_id,
            related_job_id=related_job_id,
        )


def format_status(value: str) -> str:
    return value.replace("_", " ").title()
