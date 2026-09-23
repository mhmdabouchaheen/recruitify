from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User, UserRole
from app.schemas.admin_user import AdminUserCreate, INTERNAL_ROLES


def list_users(
    db: Session,
    *,
    search: str | None = None,
    role: UserRole | None = None,
    is_active: bool | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[User]:
    statement = select(User)
    if search:
        term = f"%{search.strip().lower()}%"
        statement = statement.where(
            or_(
                func.lower(User.first_name).like(term),
                func.lower(User.last_name).like(term),
                func.lower(User.email).like(term),
                func.lower(func.concat(User.first_name, " ", User.last_name)).like(term),
            )
        )
    if role:
        statement = statement.where(User.role == role)
    if is_active is not None:
        statement = statement.where(User.is_active.is_(is_active))
    statement = statement.order_by(User.created_at.desc(), User.id.desc()).offset(skip).limit(limit)
    return list(db.scalars(statement).all())


def get_user(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def create_internal_user(db: Session, user_in: AdminUserCreate) -> User:
    if user_in.role not in INTERNAL_ROLES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Only internal roles can be created by Admin")
    user = User(
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        email=user_in.email.lower(),
        hashed_password=hash_password(user_in.password),
        role=user_in.role,
        is_active=True,
    )
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered") from exc
    except SQLAlchemyError:
        db.rollback()
        raise


def change_user_role(db: Session, *, target_user_id: int, next_role: UserRole, actor_id: int) -> User | None:
    user = get_user(db, target_user_id)
    if user is None:
        return None
    if target_user_id == actor_id and user.role == UserRole.ADMIN and next_role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin cannot remove their own Admin role")
    if user.role == UserRole.ADMIN and next_role != UserRole.ADMIN and _active_admin_count(db) <= 1 and user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one active Admin account is required")
    user.role = next_role
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except SQLAlchemyError:
        db.rollback()
        raise


def set_user_active(db: Session, *, target_user_id: int, is_active: bool, actor_id: int) -> User | None:
    user = get_user(db, target_user_id)
    if user is None:
        return None
    if target_user_id == actor_id and not is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin cannot deactivate their own account")
    if user.role == UserRole.ADMIN and user.is_active and not is_active and _active_admin_count(db) <= 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one active Admin account is required")
    user.is_active = is_active
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except SQLAlchemyError:
        db.rollback()
        raise


def _active_admin_count(db: Session) -> int:
    return int(db.scalar(select(func.count()).select_from(User).where(User.role == UserRole.ADMIN, User.is_active.is_(True))) or 0)
