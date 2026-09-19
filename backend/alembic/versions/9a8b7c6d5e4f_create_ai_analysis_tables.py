"""create ai analysis tables

Revision ID: 9a8b7c6d5e4f
Revises: 7f2d4b6a9c13
Create Date: 2026-09-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9a8b7c6d5e4f"
down_revision: Union[str, Sequence[str], None] = "7f2d4b6a9c13"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cv_analyses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cv_id", sa.Integer(), nullable=False),
        sa.Column("extracted_text_preview", sa.Text(), nullable=True),
        sa.Column("professional_summary", sa.Text(), nullable=True),
        sa.Column("skills", sa.JSON(), nullable=False),
        sa.Column("technologies", sa.JSON(), nullable=False),
        sa.Column("education", sa.JSON(), nullable=False),
        sa.Column("experience", sa.JSON(), nullable=False),
        sa.Column("total_experience_years", sa.Float(), nullable=True),
        sa.Column("job_titles", sa.JSON(), nullable=False),
        sa.Column("notable_projects", sa.JSON(), nullable=False),
        sa.Column("analysis_provider", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["cv_id"], ["cvs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cv_id", name="uq_cv_analyses_cv_id"),
    )
    op.create_index(op.f("ix_cv_analyses_cv_id"), "cv_analyses", ["cv_id"], unique=False)
    op.create_index(op.f("ix_cv_analyses_id"), "cv_analyses", ["id"], unique=False)
    op.create_table(
        "application_matches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("cv_analysis_id", sa.Integer(), nullable=False),
        sa.Column("overall_score", sa.Float(), nullable=False),
        sa.Column("skills_score", sa.Float(), nullable=False),
        sa.Column("experience_score", sa.Float(), nullable=False),
        sa.Column("education_score", sa.Float(), nullable=False),
        sa.Column("matched_required_skills", sa.JSON(), nullable=False),
        sa.Column("matched_preferred_skills", sa.JSON(), nullable=False),
        sa.Column("missing_required_skills", sa.JSON(), nullable=False),
        sa.Column("relevant_experience", sa.Text(), nullable=True),
        sa.Column("education_assessment", sa.Text(), nullable=True),
        sa.Column("strengths", sa.JSON(), nullable=False),
        sa.Column("gaps", sa.JSON(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["cv_analysis_id"], ["cv_analyses.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("application_id", name="uq_application_matches_application_id"),
    )
    op.create_index(op.f("ix_application_matches_application_id"), "application_matches", ["application_id"], unique=False)
    op.create_index(op.f("ix_application_matches_cv_analysis_id"), "application_matches", ["cv_analysis_id"], unique=False)
    op.create_index(op.f("ix_application_matches_id"), "application_matches", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_application_matches_id"), table_name="application_matches")
    op.drop_index(op.f("ix_application_matches_cv_analysis_id"), table_name="application_matches")
    op.drop_index(op.f("ix_application_matches_application_id"), table_name="application_matches")
    op.drop_table("application_matches")
    op.drop_index(op.f("ix_cv_analyses_id"), table_name="cv_analyses")
    op.drop_index(op.f("ix_cv_analyses_cv_id"), table_name="cv_analyses")
    op.drop_table("cv_analyses")
