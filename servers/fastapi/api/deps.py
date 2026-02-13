import uuid
from typing import Callable, Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from enums.user_role import UserRole
from models.sql.user import UserModel
from services.auth_service import decode_access_token, get_user_by_api_key
from services.database import get_async_session


bearer_scheme = HTTPBearer(auto_error=False)
api_key_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_async_session),
) -> UserModel:
    token = credentials.credentials if credentials else None
    if not token:
        token = request.cookies.get("auth_token") or request.query_params.get("token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await session.get(UserModel, uuid.UUID(user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User inactive or not found",
        )
    return user


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_async_session),
) -> Optional[UserModel]:
    token = credentials.credentials if credentials else None
    if not token:
        token = request.cookies.get("auth_token") or request.query_params.get("token")
    if not token:
        return None
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    user = await session.get(UserModel, uuid.UUID(user_id))
    if not user or not user.is_active:
        return None
    return user


async def get_current_user_or_api_key(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    api_key: Optional[str] = Depends(api_key_scheme),
    session: AsyncSession = Depends(get_async_session),
) -> UserModel:
    if credentials:
        return await get_current_user(request, credentials, session)

    token_value = request.cookies.get("auth_token") or request.query_params.get("token")
    if token_value:
        try:
            payload = decode_access_token(token_value)
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user = await session.get(UserModel, uuid.UUID(user_id))
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User inactive or not found",
            )
        return user

    api_key_param = api_key or request.query_params.get("api_key")
    if api_key_param:
        user = await get_user_by_api_key(session, api_key_param)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
            )
        return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_roles(*roles: UserRole) -> Callable[[UserModel], UserModel]:
    allowed = {role.value for role in roles}
    if UserRole.admin.value in allowed:
        allowed.add(UserRole.superadmin.value)

    async def checker(
        user: UserModel = Depends(get_current_user_or_api_key),
    ) -> UserModel:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return checker


async def enforce_ppt_access(
    request: Request, user: UserModel = Depends(get_current_user_or_api_key)
) -> UserModel:
    if user.role == UserRole.viewer.value and request.method not in {
        "GET",
        "HEAD",
        "OPTIONS",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewer role is read-only",
        )
    return user
