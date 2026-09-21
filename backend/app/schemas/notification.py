from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.notification import NotificationType


class NotificationResponse(BaseModel):
    id: int
    type: NotificationType
    title: str
    message: str
    is_read: bool
    related_application_id: int | None = None
    related_interview_id: int | None = None
    related_job_id: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UnreadCountResponse(BaseModel):
    unread_count: int
