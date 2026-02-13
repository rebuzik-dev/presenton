from typing import List, Optional
import uuid

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from api.deps import get_current_user, get_optional_user, require_roles
from enums.user_role import UserRole
from models.auth import (
    ApiKeyCreateRequest,
    ApiKeyPublic,
    ApiKeyResponse,
    TokenResponse,
    UserCreateRequest,
    UserLoginRequest,
    UserPublic,
)
from models.sql.api_key import ApiKeyModel
from models.sql.user import UserModel
from services.auth_service import authenticate_user, create_access_token, create_api_key, create_user
from services.database import get_async_session
from utils.datetime_utils import get_current_utc_datetime


API_V1_AUTH_ROUTER = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@API_V1_AUTH_ROUTER.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register_user(
    request: UserCreateRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: Optional[UserModel] = Depends(get_optional_user),
):
    existing = await session.execute(
        select(UserModel).where(UserModel.username == request.username)
    )
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
        )

    any_user = await session.execute(select(UserModel.id).limit(1))
    is_first_user = any_user.scalar_one_or_none() is None

    if is_first_user:
        role = UserRole.superadmin
    elif (
        request.role
        and request.role != UserRole.superadmin
        and current_user
        and current_user.role == UserRole.superadmin.value
    ):
        role = request.role
    else:
        role = UserRole.viewer

    user = await create_user(session, request.username, request.password, role)
    return UserPublic(
        id=user.id,
        username=user.username,
        role=UserRole(user.role),
        is_active=user.is_active,
        created_at=user.created_at,
    )


@API_V1_AUTH_ROUTER.post("/login", response_model=TokenResponse)
async def login(
    request: UserLoginRequest, session: AsyncSession = Depends(get_async_session)
):
    user = await authenticate_user(session, request.username, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token, expires_at = create_access_token(user)
    return TokenResponse(
        access_token=token,
        expires_at=expires_at,
        user=UserPublic(
            id=user.id,
            username=user.username,
            role=UserRole(user.role),
            is_active=user.is_active,
            created_at=user.created_at,
        ),
    )


@API_V1_AUTH_ROUTER.get("/me", response_model=UserPublic)
async def get_me(current_user: UserModel = Depends(get_current_user)):
    return UserPublic(
        id=current_user.id,
        username=current_user.username,
        role=UserRole(current_user.role),
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )


@API_V1_AUTH_ROUTER.get(
    "/users",
    response_model=List[UserPublic],
    dependencies=[Depends(require_roles(UserRole.admin))],
)
async def list_users(
    session: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(get_current_user),
):
    result = await session.execute(select(UserModel))
    users = result.scalars().all()
    return [
        UserPublic(
            id=user.id,
            username=user.username,
            role=UserRole(user.role),
            is_active=user.is_active,
            created_at=user.created_at,
        )
        for user in users
    ]


@API_V1_AUTH_ROUTER.patch(
    "/users/{user_id}/role",
    response_model=UserPublic,
    dependencies=[Depends(require_roles(UserRole.admin))],
)
async def update_user_role(
    user_id: uuid.UUID,
    role: UserRole = Body(embed=True),
    session: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(get_current_user),
):
    user = await session.get(UserModel, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if role == UserRole.superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin role cannot be assigned via this endpoint",
        )

    is_current_superadmin = current_user.role == UserRole.superadmin.value
    is_target_superadmin = user.role == UserRole.superadmin.value

    if is_target_superadmin and not is_current_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmin can modify superadmin account",
        )

    if current_user.id == user.id and is_current_superadmin and role != UserRole.superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin cannot remove own superadmin role",
        )

    if (
        current_user.role == UserRole.admin.value
        and (user.role == UserRole.admin.value or role == UserRole.admin)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmin can grant or revoke admin role",
        )

    user.role = role.value
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return UserPublic(
        id=user.id,
        username=user.username,
        role=UserRole(user.role),
        is_active=user.is_active,
        created_at=user.created_at,
    )


@API_V1_AUTH_ROUTER.post(
    "/api-keys",
    response_model=ApiKeyResponse,
    dependencies=[Depends(require_roles(UserRole.admin, UserRole.editor))],
)
async def create_api_key_endpoint(
    request: ApiKeyCreateRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(get_current_user),
):
    target_user_id = current_user.id
    if request.user_id and current_user.role in {
        UserRole.admin.value,
        UserRole.superadmin.value,
    }:
        target_user_id = request.user_id
    elif request.user_id and current_user.role not in {
        UserRole.admin.value,
        UserRole.superadmin.value,
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create API keys for other users",
        )

    raw_key, api_key = await create_api_key(
        session, user_id=target_user_id, name=request.name
    )
    return ApiKeyResponse(
        id=api_key.id,
        name=api_key.name,
        api_key=raw_key,
        created_at=api_key.created_at,
    )


@API_V1_AUTH_ROUTER.get(
    "/api-keys",
    response_model=List[ApiKeyPublic],
    dependencies=[Depends(require_roles(UserRole.admin, UserRole.editor))],
)
async def list_api_keys(
    user_id: Optional[uuid.UUID] = None,
    session: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(get_current_user),
):
    target_user_id = current_user.id
    if user_id and current_user.role in {
        UserRole.admin.value,
        UserRole.superadmin.value,
    }:
        target_user_id = user_id
    elif user_id and current_user.role not in {
        UserRole.admin.value,
        UserRole.superadmin.value,
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can list API keys for other users",
        )

    result = await session.execute(
        select(ApiKeyModel).where(ApiKeyModel.user_id == target_user_id)
    )
    keys = result.scalars().all()
    return [
        ApiKeyPublic(
            id=api_key.id,
            name=api_key.name,
            created_at=api_key.created_at,
            last_used_at=api_key.last_used_at,
            is_active=api_key.is_active,
        )
        for api_key in keys
    ]


@API_V1_AUTH_ROUTER.delete(
    "/api-keys/{api_key_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles(UserRole.admin, UserRole.editor))],
)
async def revoke_api_key(
    api_key_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: UserModel = Depends(get_current_user),
):
    api_key = await session.get(ApiKeyModel, api_key_id)
    if not api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")

    if api_key.user_id != current_user.id and current_user.role not in {
        UserRole.admin.value,
        UserRole.superadmin.value,
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to revoke this API key",
        )

    api_key.is_active = False
    api_key.revoked_at = get_current_utc_datetime()
    session.add(api_key)
    await session.commit()
