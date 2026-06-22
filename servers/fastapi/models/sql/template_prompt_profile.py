from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import Boolean, Column, DateTime, JSON, String
from sqlmodel import Field, SQLModel

from utils.datetime_utils import get_current_utc_datetime


class TemplatePromptProfileModel(SQLModel, table=True):
    __tablename__ = "template_prompt_profiles"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    template_slug: str = Field(
        sa_column=Column(String, unique=True, index=True, nullable=False),
        description="Template slug whose prompt overrides are stored here.",
    )
    template_id: Optional[uuid.UUID] = Field(
        default=None,
        index=True,
        description="Optional templates.id for DB-backed custom or legacy templates.",
    )
    is_active: bool = Field(
        sa_column=Column(Boolean, nullable=False, default=True),
        default=True,
    )
    template_prompt: Optional[str] = Field(
        default=None,
        description="Template-level LLM prompt or description override.",
    )
    layout_prompts: dict = Field(
        sa_column=Column(JSON, nullable=False, default=dict),
        default_factory=dict,
        description="Per-layout prompt overrides keyed by layout id, name, or normalized id.",
    )
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), nullable=False, default=get_current_utc_datetime
        ),
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            default=get_current_utc_datetime,
            onupdate=get_current_utc_datetime,
        ),
    )
    created_by_id: Optional[uuid.UUID] = Field(default=None)
