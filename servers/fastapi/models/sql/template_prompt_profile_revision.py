from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import Column, DateTime, Integer, JSON, String, UniqueConstraint
from sqlmodel import Field, SQLModel

from utils.datetime_utils import get_current_utc_datetime


class TemplatePromptProfileRevisionModel(SQLModel, table=True):
    __tablename__ = "template_prompt_profile_revisions"
    __table_args__ = (
        UniqueConstraint(
            "template_slug",
            "version",
            name="uq_template_prompt_profile_revisions_slug_version",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    template_slug: str = Field(
        sa_column=Column(String, index=True, nullable=False),
        description="Template slug whose prompt profile was snapshotted.",
    )
    version: int = Field(sa_column=Column(Integer, nullable=False, index=True))
    fingerprint: str = Field(
        sa_column=Column(String(64), nullable=False, index=True),
    )
    is_active: bool = Field(default=True)
    template_prompt: Optional[str] = Field(default=None)
    layout_prompts: dict = Field(
        sa_column=Column(JSON, nullable=False, default=dict),
        default_factory=dict,
    )
    action: str = Field(sa_column=Column(String(16), nullable=False))
    changes: list = Field(
        sa_column=Column(JSON, nullable=False, default=list),
        default_factory=list,
    )
    restored_from_revision_id: Optional[uuid.UUID] = Field(default=None, index=True)
    created_by_id: Optional[uuid.UUID] = Field(default=None, index=True)
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            default=get_current_utc_datetime,
        ),
    )
