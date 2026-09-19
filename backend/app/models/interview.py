import enum
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InterviewType(str, enum.Enum):
    ONSITE = "onsite"
    VIDEO = "video"
    PHONE = "phone"


class InterviewStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class InterviewQuestionSource(str, enum.Enum):
    AI = "ai"
    MANUAL = "manual"


class InterviewRecommendation(str, enum.Enum):
    STRONG_YES = "strong_yes"
    YES = "yes"
    NEUTRAL = "neutral"
    NO = "no"
    STRONG_NO = "strong_no"


class Interview(Base):
    __tablename__ = "interviews"
    __table_args__ = (CheckConstraint("duration_minutes BETWEEN 15 AND 480", name="ck_interviews_duration_minutes"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    interview_type: Mapped[InterviewType] = mapped_column(
        Enum(InterviewType, name="interview_type", values_callable=lambda values: [value.value for value in values]),
        nullable=False,
    )
    location_or_link: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[InterviewStatus] = mapped_column(
        Enum(InterviewStatus, name="interview_status", values_callable=lambda values: [value.value for value in values]),
        default=InterviewStatus.SCHEDULED,
        nullable=False,
    )
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    application = relationship("Application", back_populates="interviews")
    created_by = relationship("User", foreign_keys=[created_by_id])
    interviewers: Mapped[list["InterviewInterviewer"]] = relationship(back_populates="interview", cascade="all, delete-orphan")
    questions: Mapped[list["InterviewQuestion"]] = relationship(back_populates="interview", cascade="all, delete-orphan", order_by="InterviewQuestion.id")
    evaluations: Mapped[list["InterviewEvaluation"]] = relationship(back_populates="interview", cascade="all, delete-orphan")


class InterviewInterviewer(Base):
    __tablename__ = "interview_interviewers"
    __table_args__ = (UniqueConstraint("interview_id", "interviewer_id", name="uq_interview_interviewers_interview_user"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    interview_id: Mapped[int] = mapped_column(ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True)
    interviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    interview = relationship("Interview", back_populates="interviewers")
    interviewer = relationship("User")


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    interview_id: Mapped[int] = mapped_column(ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    source: Mapped[InterviewQuestionSource] = mapped_column(
        Enum(InterviewQuestionSource, name="interview_question_source", values_callable=lambda values: [value.value for value in values]),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    interview = relationship("Interview", back_populates="questions")


class InterviewEvaluation(Base):
    __tablename__ = "interview_evaluations"
    __table_args__ = (
        UniqueConstraint("interview_id", "interviewer_id", name="uq_interview_evaluations_interview_user"),
        CheckConstraint("technical_rating BETWEEN 1 AND 5", name="ck_interview_evaluations_technical"),
        CheckConstraint("communication_rating BETWEEN 1 AND 5", name="ck_interview_evaluations_communication"),
        CheckConstraint("problem_solving_rating BETWEEN 1 AND 5", name="ck_interview_evaluations_problem_solving"),
        CheckConstraint("overall_rating BETWEEN 1 AND 5", name="ck_interview_evaluations_overall"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    interview_id: Mapped[int] = mapped_column(ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True)
    interviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    technical_rating: Mapped[int] = mapped_column(Integer, nullable=False)
    communication_rating: Mapped[int] = mapped_column(Integer, nullable=False)
    problem_solving_rating: Mapped[int] = mapped_column(Integer, nullable=False)
    overall_rating: Mapped[int] = mapped_column(Integer, nullable=False)
    strengths: Mapped[str | None] = mapped_column(Text)
    concerns: Mapped[str | None] = mapped_column(Text)
    comments: Mapped[str | None] = mapped_column(Text)
    recommendation: Mapped[InterviewRecommendation] = mapped_column(
        Enum(InterviewRecommendation, name="interview_recommendation", values_callable=lambda values: [value.value for value in values]),
        nullable=False,
    )
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    interview = relationship("Interview", back_populates="evaluations")
    interviewer = relationship("User")
