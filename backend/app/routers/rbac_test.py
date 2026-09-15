from fastapi import APIRouter, Depends

from app.dependencies.auth import (
    require_admin,
    require_authenticated_user,
    require_hr_or_admin,
    require_interviewer_hr_or_admin,
)
from app.models.user import User


router = APIRouter(prefix="/test/rbac", tags=["rbac-test"])


@router.get("/authenticated")
def authenticated_only(current_user: User = Depends(require_authenticated_user)):
    return {"user_id": current_user.id, "role": current_user.role}


@router.get("/admin")
def admin_only(current_user: User = Depends(require_admin)):
    return {"user_id": current_user.id, "role": current_user.role}


@router.get("/hr-or-admin")
def hr_or_admin(current_user: User = Depends(require_hr_or_admin)):
    return {"user_id": current_user.id, "role": current_user.role}


@router.get("/interviewer-hr-or-admin")
def interviewer_hr_or_admin(
    current_user: User = Depends(require_interviewer_hr_or_admin),
):
    return {"user_id": current_user.id, "role": current_user.role}
