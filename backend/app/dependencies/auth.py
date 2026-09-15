from collections.abc import Sequence

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User, UserRole
from app.services.users import get_user_by_id


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def unauthorized_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def forbidden_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not enough permissions",
    )


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_access_token(token)
    if payload is None:
        raise unauthorized_exception()

    subject = payload.get("sub")
    if subject is None:
        raise unauthorized_exception()

    try:
        user_id = int(subject)
    except ValueError as exc:
        raise unauthorized_exception() from exc

    user = get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        raise unauthorized_exception()

    return user


def require_roles(allowed_roles: Sequence[UserRole]):
    allowed = set(allowed_roles)

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed:
            raise forbidden_exception()
        return current_user

    return dependency


require_authenticated_user = get_current_user
require_admin = require_roles([UserRole.ADMIN])
require_hr_or_admin = require_roles([UserRole.HR, UserRole.ADMIN])
require_interviewer_hr_or_admin = require_roles(
    [UserRole.INTERVIEWER, UserRole.HR, UserRole.ADMIN]
)
