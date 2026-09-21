from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import require_hr_or_admin
from app.models.user import User
from app.schemas.dashboard import HRDashboardResponse
from app.services.dashboard import get_hr_dashboard

router = APIRouter(prefix="/hr/dashboard", tags=["hr dashboard"])


@router.get("", response_model=HRDashboardResponse)
def get_dashboard_endpoint(
    current_user: User = Depends(require_hr_or_admin),
    db: Session = Depends(get_db),
) -> HRDashboardResponse:
    return get_hr_dashboard(db)
