"""create notifications table

Revision ID: d3e4f5a6b7c8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-21 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

notification_type = postgresql.ENUM(
    "application_submitted",
    "application_status_changed",
    "interview_assigned",
    "interview_scheduled",
    "interview_rescheduled",
    "interview_cancelled",
    "contract_sent",
    "contract_accepted",
    "contract_declined",
    name="notification_type",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM(
        "application_submitted",
        "application_status_changed",
        "interview_assigned",
        "interview_scheduled",
        "interview_rescheduled",
        "interview_cancelled",
        "contract_sent",
        "contract_accepted",
        "contract_declined",
        name="notification_type",
    ).create(bind, checkfirst=True)
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("type", notification_type, nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("related_application_id", sa.Integer(), nullable=True),
        sa.Column("related_interview_id", sa.Integer(), nullable=True),
        sa.Column("related_job_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["related_application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["related_interview_id"], ["interviews.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["related_job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notifications_id"), "notifications", ["id"], unique=False)
    op.create_index(op.f("ix_notifications_user_id"), "notifications", ["user_id"], unique=False)
    op.create_index(op.f("ix_notifications_type"), "notifications", ["type"], unique=False)
    op.create_index(op.f("ix_notifications_is_read"), "notifications", ["is_read"], unique=False)
    op.create_index(op.f("ix_notifications_related_application_id"), "notifications", ["related_application_id"], unique=False)
    op.create_index(op.f("ix_notifications_related_interview_id"), "notifications", ["related_interview_id"], unique=False)
    op.create_index(op.f("ix_notifications_related_job_id"), "notifications", ["related_job_id"], unique=False)
    op.create_index(op.f("ix_notifications_created_at"), "notifications", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_notifications_created_at"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_related_job_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_related_interview_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_related_application_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_is_read"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_type"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_user_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_id"), table_name="notifications")
    op.drop_table("notifications")
    bind = op.get_bind()
    postgresql.ENUM(name="notification_type").drop(bind, checkfirst=True)
