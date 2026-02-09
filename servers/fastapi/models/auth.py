from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from enums.user_role import UserRole


class UserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)
    role: Optional[UserRole] = None


class UserLoginRequest(BaseModel):
    username: str
    password: str


class UserPublic(BaseModel):
    id: UUID
    username: str
    role: UserRole
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: UserPublic


class ApiKeyCreateRequest(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    user_id: Optional[UUID] = None


class ApiKeyResponse(BaseModel):
    id: UUID
    name: Optional[str]
    api_key: str
    created_at: datetime


class ApiKeyPublic(BaseModel):
    id: UUID
    name: Optional[str]
    created_at: datetime
    last_used_at: Optional[datetime]
    is_active: bool
