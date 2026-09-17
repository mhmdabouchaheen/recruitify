import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.user import User


class EmploymentType(str, enum.Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERNSHIP = "internship"
    TEMPORARY = "temporary"


class WorkplaceType(str, enum.Enum):
    ONSITE = "onsite"
    HYBRID = "hybrid"
    REMOTE = "remote"


class JobStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"
    ARCHIVED = "archived"


class SkillType(str, enum.Enum):
    REQUIRED = "required"
    PREFERRED = "preferred"


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(150), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    employment_type: Mapped[EmploymentType] = mapped_column(
        Enum(
            EmploymentType,
            name="employment_type",
            values_callable=lambda values: [value.value for value in values],
        ),
        nullable=False,
    )
    workplace_type: Mapped[WorkplaceType] = mapped_column(
        Enum(
            WorkplaceType,
            name="workplace_type",
            values_callable=lambda values: [value.value for value in values],
        ),
        nullable=False,
    )
    status: Mapped[JobStatus] = mapped_column(
        Enum(
            JobStatus,
            name="job_status",
            values_callable=lambda values: [value.value for value in values],
        ),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    responsibilities: Mapped[str | None] = mapped_column(Text)
    requirements: Mapped[str] = mapped_column(Text, nullable=False)
    required_experience: Mapped[str | None] = mapped_column(String(150))
    required_education: Mapped[str | None] = mapped_column(String(150))
    application_deadline: Mapped[date | None] = mapped_column(Date)
    positions_count: Mapped[int] = mapped_column(
        Integer,
        default=1,
        server_default=text("1"),
        nullable=False,
    )
    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    creator: Mapped[User] = relationship()
    skills: Mapped[list["JobSkill"]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
    )
    application_questions: Mapped[list["ApplicationQuestion"]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
        order_by="ApplicationQuestion.display_order",
    )


class JobSkill(Base):
    __tablename__ = "job_skills"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    skill_type: Mapped[SkillType] = mapped_column(
        Enum(
            SkillType,
            name="skill_type",
            values_callable=lambda values: [value.value for value in values],
        ),
        nullable=False,
    )

    job: Mapped[Job] = relationship(back_populates="skills")


class ApplicationQuestion(Base):
    __tablename__ = "application_questions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(50), nullable=False)
    is_required: Mapped[bool] = mapped_column(
        default=True,
        server_default=text("true"),
        nullable=False,
    )
    display_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default=text("0"),
        nullable=False,
    )

    job: Mapped[Job] = relationship(back_populates="application_questions")
