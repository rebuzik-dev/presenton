import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import uuid

import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from enums.user_role import UserRole
from models.sql.api_key import ApiKeyModel
from models.sql.user import UserModel
from utils.datetime_utils import get_current_utc_datetime
from utils.get_env import (
    get_api_key_secret_env,
    get_jwt_algorithm_env,
    get_jwt_expires_minutes_env,
    get_jwt_secret_env,
)


PASSWORD_HASH_ITERATIONS = 100_000
PASSWORD_SALT_BYTES = 16


def _get_jwt_secret() -> str:
    secret = get_jwt_secret_env()
    if not secret:
        raise RuntimeError("JWT_SECRET is not set")
    return secret


def _get_jwt_algorithm() -> str:
    return get_jwt_algorithm_env() or "HS256"


def _get_api_key_secret() -> str:
    return get_api_key_secret_env() or _get_jwt_secret()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(PASSWORD_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_HASH_ITERATIONS
    )
    return base64.b64encode(salt + digest).decode("utf-8")


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        raw = base64.b64decode(stored_hash.encode("utf-8"))
    except Exception:
        return False
    if len(raw) <= PASSWORD_SALT_BYTES:
        return False
    salt = raw[:PASSWORD_SALT_BYTES]
    expected = raw[PASSWORD_SALT_BYTES:]
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_HASH_ITERATIONS
    )
    return hmac.compare_digest(digest, expected)


def create_access_token(user: UserModel) -> Tuple[str, datetime]:
    now = datetime.now(timezone.utc)
    expires_minutes = get_jwt_expires_minutes_env() or 720
    expires_at = now + timedelta(minutes=expires_minutes)
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, _get_jwt_secret(), algorithm=_get_jwt_algorithm())
    return token, expires_at


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, _get_jwt_secret(), algorithms=[_get_jwt_algorithm()])


def hash_api_key(raw_key: str) -> str:
    secret = _get_api_key_secret().encode("utf-8")
    return hmac.new(secret, raw_key.encode("utf-8"), hashlib.sha256).hexdigest()


async def authenticate_user(
    session: AsyncSession, username: str, password: str
) -> Optional[UserModel]:
    result = await session.execute(
        select(UserModel).where(UserModel.username == username)
    )
    user = result.scalars().first()
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


async def create_user(
    session: AsyncSession, username: str, password: str, role: UserRole
) -> UserModel:
    password_hash = hash_password(password)
    user = UserModel(username=username, password_hash=password_hash, role=role.value)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def create_api_key(
    session: AsyncSession, user_id: uuid.UUID, name: Optional[str] = None
) -> Tuple[str, ApiKeyModel]:
    raw_key = secrets.token_urlsafe(32)
    key_hash = hash_api_key(raw_key)
    api_key = ApiKeyModel(
        user_id=user_id,
        name=name,
        key_hash=key_hash,
        created_at=get_current_utc_datetime(),
    )
    session.add(api_key)
    await session.commit()
    await session.refresh(api_key)
    return raw_key, api_key


async def get_user_by_api_key(
    session: AsyncSession, raw_key: str
) -> Optional[UserModel]:
    key_hash = hash_api_key(raw_key)
    result = await session.execute(
        select(ApiKeyModel).where(
            ApiKeyModel.key_hash == key_hash, ApiKeyModel.is_active == True
        )
    )
    api_key = result.scalars().first()
    if not api_key:
        return None
    user = await session.get(UserModel, api_key.user_id)
    if not user or not user.is_active:
        return None
    api_key.last_used_at = get_current_utc_datetime()
    session.add(api_key)
    await session.commit()
    return user
