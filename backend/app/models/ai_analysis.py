from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, JSON, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CVAnalysis(Base):
    __tablename__ = "cv_analyses"
    __table_args__ = (UniqueConstraint("cv_id", name="uq_cv_analyses_cv_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    cv_id: Mapped[int] = mapped_column(ForeignKey("cvs.id", ondelete="CASCADE"), nullable=False, index=True)
    extracted_text_preview: Mapped[str | None] = mapped_column(Text)
    professional_summary: Mapped[str | None] = mapped_column(Text)
    skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    technologies: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    education: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    experience: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    total_experience_years: Mapped[float | None] = mapped_column(Float)
    job_titles: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    notable_projects: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    analysis_provider: Mapped[str] = mapped_column(default="deterministic", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    cv = relationship("CV")
    matches = relationship("ApplicationMatch", back_populates="cv_analysis")


class ApplicationMatch(Base):
    __tablename__ = "application_matches"
    __table_args__ = (UniqueConstraint("application_id", name="uq_application_matches_application_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    cv_analysis_id: Mapped[int] = mapped_column(ForeignKey("cv_analyses.id", ondelete="RESTRICT"), nullable=False, index=True)
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)
    skills_score: Mapped[float] = mapped_column(Float, nullable=False)
    experience_score: Mapped[float] = mapped_column(Float, nullable=False)
    education_score: Mapped[float] = mapped_column(Float, nullable=False)
    matched_required_skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    matched_preferred_skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    missing_required_skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    relevant_experience: Mapped[str | None] = mapped_column(Text)
    education_assessment: Mapped[str | None] = mapped_column(Text)
    strengths: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    gaps: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    application = relationship("Application")
    cv_analysis = relationship("CVAnalysis", back_populates="matches")
