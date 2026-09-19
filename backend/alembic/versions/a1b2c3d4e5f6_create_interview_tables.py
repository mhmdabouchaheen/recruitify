"""create interview tables

Revision ID: a1b2c3d4e5f6
Revises: 9a8b7c6d5e4f
Create Date: 2026-09-19 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "9a8b7c6d5e4f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

interview_type = postgresql.ENUM("onsite", "video", "phone", name="interview_type", create_type=False)
interview_status = postgresql.ENUM("scheduled", "completed", "cancelled", name="interview_status", create_type=False)
question_source = postgresql.ENUM("ai", "manual", name="interview_question_source", create_type=False)
recommendation = postgresql.ENUM("strong_yes", "yes", "neutral", "no", "strong_no", name="interview_recommendation", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM("onsite", "video", "phone", name="interview_type").create(bind, checkfirst=True)
    postgresql.ENUM("scheduled", "completed", "cancelled", name="interview_status").create(bind, checkfirst=True)
    postgresql.ENUM("ai", "manual", name="interview_question_source").create(bind, checkfirst=True)
    postgresql.ENUM("strong_yes", "yes", "neutral", "no", "strong_no", name="interview_recommendation").create(bind, checkfirst=True)

    op.create_table(
        "interviews",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("interview_type", interview_type, nullable=False),
        sa.Column("location_or_link", sa.String(length=500), nullable=True),
        sa.Column("status", interview_status, nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("duration_minutes BETWEEN 15 AND 480", name="ck_interviews_duration_minutes"),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_interviews_id"), "interviews", ["id"], unique=False)
    op.create_index(op.f("ix_interviews_application_id"), "interviews", ["application_id"], unique=False)
    op.create_index(op.f("ix_interviews_created_by_id"), "interviews", ["created_by_id"], unique=False)
    op.create_index(op.f("ix_interviews_scheduled_at"), "interviews", ["scheduled_at"], unique=False)

    op.create_table(
        "interview_interviewers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("interview_id", sa.Integer(), nullable=False),
        sa.Column("interviewer_id", sa.Integer(), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["interview_id"], ["interviews.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["interviewer_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("interview_id", "interviewer_id", name="uq_interview_interviewers_interview_user"),
    )
    op.create_index(op.f("ix_interview_interviewers_id"), "interview_interviewers", ["id"], unique=False)
    op.create_index(op.f("ix_interview_interviewers_interview_id"), "interview_interviewers", ["interview_id"], unique=False)
    op.create_index(op.f("ix_interview_interviewers_interviewer_id"), "interview_interviewers", ["interviewer_id"], unique=False)

    op.create_table(
        "interview_questions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("interview_id", sa.Integer(), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("source", question_source, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["interview_id"], ["interviews.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_interview_questions_id"), "interview_questions", ["id"], unique=False)
    op.create_index(op.f("ix_interview_questions_interview_id"), "interview_questions", ["interview_id"], unique=False)

    op.create_table(
        "interview_evaluations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("interview_id", sa.Integer(), nullable=False),
        sa.Column("interviewer_id", sa.Integer(), nullable=False),
        sa.Column("technical_rating", sa.Integer(), nullable=False),
        sa.Column("communication_rating", sa.Integer(), nullable=False),
        sa.Column("problem_solving_rating", sa.Integer(), nullable=False),
        sa.Column("overall_rating", sa.Integer(), nullable=False),
        sa.Column("strengths", sa.Text(), nullable=True),
        sa.Column("concerns", sa.Text(), nullable=True),
        sa.Column("comments", sa.Text(), nullable=True),
        sa.Column("recommendation", recommendation, nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("technical_rating BETWEEN 1 AND 5", name="ck_interview_evaluations_technical"),
        sa.CheckConstraint("communication_rating BETWEEN 1 AND 5", name="ck_interview_evaluations_communication"),
        sa.CheckConstraint("problem_solving_rating BETWEEN 1 AND 5", name="ck_interview_evaluations_problem_solving"),
        sa.CheckConstraint("overall_rating BETWEEN 1 AND 5", name="ck_interview_evaluations_overall"),
        sa.ForeignKeyConstraint(["interview_id"], ["interviews.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["interviewer_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("interview_id", "interviewer_id", name="uq_interview_evaluations_interview_user"),
    )
    op.create_index(op.f("ix_interview_evaluations_id"), "interview_evaluations", ["id"], unique=False)
    op.create_index(op.f("ix_interview_evaluations_interview_id"), "interview_evaluations", ["interview_id"], unique=False)
    op.create_index(op.f("ix_interview_evaluations_interviewer_id"), "interview_evaluations", ["interviewer_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_interview_evaluations_interviewer_id"), table_name="interview_evaluations")
    op.drop_index(op.f("ix_interview_evaluations_interview_id"), table_name="interview_evaluations")
    op.drop_index(op.f("ix_interview_evaluations_id"), table_name="interview_evaluations")
    op.drop_table("interview_evaluations")
    op.drop_index(op.f("ix_interview_questions_interview_id"), table_name="interview_questions")
    op.drop_index(op.f("ix_interview_questions_id"), table_name="interview_questions")
    op.drop_table("interview_questions")
    op.drop_index(op.f("ix_interview_interviewers_interviewer_id"), table_name="interview_interviewers")
    op.drop_index(op.f("ix_interview_interviewers_interview_id"), table_name="interview_interviewers")
    op.drop_index(op.f("ix_interview_interviewers_id"), table_name="interview_interviewers")
    op.drop_table("interview_interviewers")
    op.drop_index(op.f("ix_interviews_scheduled_at"), table_name="interviews")
    op.drop_index(op.f("ix_interviews_created_by_id"), table_name="interviews")
    op.drop_index(op.f("ix_interviews_application_id"), table_name="interviews")
    op.drop_index(op.f("ix_interviews_id"), table_name="interviews")
    op.drop_table("interviews")
    bind = op.get_bind()
    postgresql.ENUM("strong_yes", "yes", "neutral", "no", "strong_no", name="interview_recommendation").drop(bind, checkfirst=True)
    postgresql.ENUM("ai", "manual", name="interview_question_source").drop(bind, checkfirst=True)
    postgresql.ENUM("scheduled", "completed", "cancelled", name="interview_status").drop(bind, checkfirst=True)
    postgresql.ENUM("onsite", "video", "phone", name="interview_type").drop(bind, checkfirst=True)
