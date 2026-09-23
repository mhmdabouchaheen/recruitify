from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import require_admin
from app.models.user import User, UserRole
from app.schemas.admin_user import AdminUserCreate, AdminUserResponse, AdminUserRoleUpdate, AdminUserStatusUpdate
from app.services.admin_users import create_internal_user, change_user_role, get_user, list_users, set_user_active

router = APIRouter(prefix="/admin/users", tags=["admin users"])


@router.get("", response_model=list[AdminUserResponse])
def read_users(
    search: str | None = Query(default=None, max_length=255),
    role: UserRole | None = None,
    is_active: bool | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return list_users(db, search=search, role=role, is_active=is_active, skip=skip, limit=limit)


@router.get("/{user_id}", response_model=AdminUserResponse)
def read_user(user_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_in: AdminUserCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return create_internal_user(db, user_in)


@router.patch("/{user_id}/role", response_model=AdminUserResponse)
def update_user_role(user_id: int, role_in: AdminUserRoleUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = change_user_role(db, target_user_id=user_id, next_role=role_in.role, actor_id=current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}/status", response_model=AdminUserResponse)
def update_user_status(user_id: int, status_in: AdminUserStatusUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = set_user_active(db, target_user_id=user_id, is_active=status_in.is_active, actor_id=current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
