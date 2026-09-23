
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import require_hr_or_admin
from app.models.application import ApplicationStatus
from app.models.job import EmploymentType, WorkplaceType
from app.models.user import User
from app.schemas.reports import RecruitmentReportsResponse
from app.services.reports import get_recruitment_reports

router = APIRouter(prefix="/hr/reports", tags=["hr reports"])


@router.get("", response_model=RecruitmentReportsResponse)
def get_reports_endpoint(
    start_date: date | None = None,
    end_date: date | None = None,
    job_id: int | None = Query(default=None, ge=1),
    department: str | None = None,
    status: ApplicationStatus | None = None,
    employment_type: EmploymentType | None = None,
    workplace_type: WorkplaceType | None = None,
    current_user: User = Depends(require_hr_or_admin),
    db: Session = Depends(get_db),
) -> RecruitmentReportsResponse:
    return get_recruitment_reports(
        db,
        start_date=start_date,
        end_date=end_date,
        job_id=job_id,
        department=department,
        status=status,
        employment_type=employment_type,
        workplace_type=workplace_type,
    )
