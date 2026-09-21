import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class NotificationType(str, enum.Enum):
    APPLICATION_SUBMITTED = "application_submitted"
    APPLICATION_STATUS_CHANGED = "application_status_changed"
    INTERVIEW_ASSIGNED = "interview_assigned"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    INTERVIEW_RESCHEDULED = "interview_rescheduled"
    INTERVIEW_CANCELLED = "interview_cancelled"
    CONTRACT_SENT = "contract_sent"
    CONTRACT_ACCEPTED = "contract_accepted"
    CONTRACT_DECLINED = "contract_declined"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type", values_callable=lambda values: [value.value for value in values]),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"), default=False, index=True)
    related_application_id: Mapped[int | None] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"), index=True)
    related_interview_id: Mapped[int | None] = mapped_column(ForeignKey("interviews.id", ondelete="CASCADE"), index=True)
    related_job_id: Mapped[int | None] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    user = relationship("User")
    related_application = relationship("Application")
    related_interview = relationship("Interview")
    related_job = relationship("Job")
