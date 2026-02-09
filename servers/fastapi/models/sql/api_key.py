from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import Boolean, Column, DateTime, String
from sqlmodel import Field, SQLModel

from utils.datetime_utils import get_current_utc_datetime


class ApiKeyModel(SQLModel, table=True):
    __tablename__ = "api_keys"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    key_hash: str = Field(sa_column=Column(String, index=True, nullable=False))
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)
    is_active: bool = Field(
        sa_column=Column(Boolean, nullable=False, default=True),
        default=True,
    )
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), nullable=False, default=get_current_utc_datetime
        )
    )
    last_used_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    revoked_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
