"""create application notes and activities

Revision ID: 7f2d4b6a9c13
Revises: 501ebe3b1b0f
Create Date: 2026-09-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "7f2d4b6a9c13"
down_revision: Union[str, Sequence[str], None] = "501ebe3b1b0f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "application_notes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_application_notes_application_id"), "application_notes", ["application_id"], unique=False)
    op.create_index(op.f("ix_application_notes_author_id"), "application_notes", ["author_id"], unique=False)
    op.create_index(op.f("ix_application_notes_id"), "application_notes", ["id"], unique=False)

    op.create_table(
        "application_activities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("from_status", postgresql.ENUM("applied", "under_review", "shortlisted", "interview_scheduled", "interview_completed", "selected", "rejected", "withdrawn", name="application_status", create_type=False), nullable=True),
        sa.Column("to_status", postgresql.ENUM("applied", "under_review", "shortlisted", "interview_scheduled", "interview_completed", "selected", "rejected", "withdrawn", name="application_status", create_type=False), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_application_activities_actor_id"), "application_activities", ["actor_id"], unique=False)
    op.create_index(op.f("ix_application_activities_application_id"), "application_activities", ["application_id"], unique=False)
    op.create_index(op.f("ix_application_activities_id"), "application_activities", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_application_activities_id"), table_name="application_activities")
    op.drop_index(op.f("ix_application_activities_application_id"), table_name="application_activities")
    op.drop_index(op.f("ix_application_activities_actor_id"), table_name="application_activities")
    op.drop_table("application_activities")
    op.drop_index(op.f("ix_application_notes_id"), table_name="application_notes")
    op.drop_index(op.f("ix_application_notes_author_id"), table_name="application_notes")
    op.drop_index(op.f("ix_application_notes_application_id"), table_name="application_notes")
    op.drop_table("application_notes")

