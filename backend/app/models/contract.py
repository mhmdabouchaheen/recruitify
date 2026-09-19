import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ContractStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class ContractType(str, enum.Enum):
    FULL_TIME = "full_time"
    FIXED_TERM = "fixed_term"
    PART_TIME = "part_time"
    INTERNSHIP = "internship"


class Contract(Base):
    __tablename__ = "contracts"
    __table_args__ = (UniqueConstraint("application_id", name="uq_contracts_application_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    contract_type: Mapped[ContractType] = mapped_column(
        Enum(ContractType, name="contract_type", values_callable=lambda values: [value.value for value in values]),
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date)
    salary_amount: Mapped[float | None] = mapped_column(Float)
    salary_currency: Mapped[str | None] = mapped_column(String(3))
    work_location: Mapped[str] = mapped_column(String(255), nullable=False)
    probation_period: Mapped[str | None] = mapped_column(String(150))
    additional_terms: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ContractStatus] = mapped_column(
        Enum(ContractStatus, name="contract_status", values_callable=lambda values: [value.value for value in values]),
        default=ContractStatus.DRAFT,
        nullable=False,
    )
    pdf_filename: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    application = relationship("Application", back_populates="contract")
    created_by = relationship("User")
