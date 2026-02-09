from datetime import datetime
import uuid

from sqlalchemy import Boolean, Column, DateTime, String
from sqlmodel import Field, SQLModel

from utils.datetime_utils import get_current_utc_datetime


class UserModel(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    username: str = Field(
        sa_column=Column(String, unique=True, index=True, nullable=False)
    )
    password_hash: str = Field(sa_column=Column(String, nullable=False))
    role: str = Field(
        sa_column=Column(String, nullable=False, default="editor"),
        default="editor",
    )
    is_active: bool = Field(
        sa_column=Column(Boolean, nullable=False, default=True),
        default=True,
    )
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), nullable=False, default=get_current_utc_datetime
        )
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            default=get_current_utc_datetime,
            onupdate=get_current_utc_datetime,
        )
    )
