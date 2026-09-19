"""create contracts table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-20 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

contract_type = postgresql.ENUM("full_time", "fixed_term", "part_time", "internship", name="contract_type", create_type=False)
contract_status = postgresql.ENUM("draft", "sent", "accepted", "declined", name="contract_status", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM("full_time", "fixed_term", "part_time", "internship", name="contract_type").create(bind, checkfirst=True)
    postgresql.ENUM("draft", "sent", "accepted", "declined", name="contract_status").create(bind, checkfirst=True)
    op.create_table(
        "contracts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("contract_type", contract_type, nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("salary_amount", sa.Float(), nullable=True),
        sa.Column("salary_currency", sa.String(length=3), nullable=True),
        sa.Column("work_location", sa.String(length=255), nullable=False),
        sa.Column("probation_period", sa.String(length=150), nullable=True),
        sa.Column("additional_terms", sa.Text(), nullable=True),
        sa.Column("status", contract_status, nullable=False),
        sa.Column("pdf_filename", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("application_id", name="uq_contracts_application_id"),
    )
    op.create_index(op.f("ix_contracts_id"), "contracts", ["id"], unique=False)
    op.create_index(op.f("ix_contracts_application_id"), "contracts", ["application_id"], unique=False)
    op.create_index(op.f("ix_contracts_created_by_id"), "contracts", ["created_by_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_contracts_created_by_id"), table_name="contracts")
    op.drop_index(op.f("ix_contracts_application_id"), table_name="contracts")
    op.drop_index(op.f("ix_contracts_id"), table_name="contracts")
    op.drop_table("contracts")
    bind = op.get_bind()
    postgresql.ENUM("draft", "sent", "accepted", "declined", name="contract_status").drop(bind, checkfirst=True)
    postgresql.ENUM("full_time", "fixed_term", "part_time", "internship", name="contract_type").drop(bind, checkfirst=True)
