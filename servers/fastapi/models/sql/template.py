from datetime import datetime
from typing import Optional, List
import uuid
from sqlalchemy import Column, DateTime, JSON, String, Boolean
from sqlmodel import SQLModel, Field

from utils.datetime_utils import get_current_utc_datetime


class TemplateLayoutItem(SQLModel):
    """Schema for a single layout within a template."""
    name: str = Field(description="Layout component name, e.g. 'BasicInfoSlideLayout'")
    file: str = Field(description="TSX filename, e.g. 'BasicInfoSlideLayout.tsx'")
    description: Optional[str] = Field(default=None, description="What this layout is for")
    json_schema: Optional[dict] = Field(default=None, description="Zod schema in JSON format (optional)")


class TemplateModel(SQLModel, table=True):
    __tablename__ = "templates"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        description="UUID for the template",
    )
    name: str = Field(description="Human friendly template name")
    slug: str = Field(
        sa_column=Column(String, unique=True, index=True, nullable=False),
        description="URL-safe identifier used in API calls, e.g. 'general', 'my-custom'",
    )
    description: Optional[str] = Field(
        default=None, description="Optional template description"
    )
    ordered: bool = Field(
        sa_column=Column(Boolean, nullable=False, default=False),
        default=False,
        description="If True, layouts are applied sequentially (Strict Mode). If False, LLM selects best layout (Smart Mode).",
    )
    is_default: bool = Field(
        sa_column=Column(Boolean, nullable=False, default=False),
        default=False,
        description="Whether this is the default template for new presentations",
    )
    is_system: bool = Field(
        sa_column=Column(Boolean, nullable=False, default=True),
        default=True,
        description="True = built-in template (readonly), False = user-created custom template",
    )
    layouts: Optional[List[dict]] = Field(
        sa_column=Column(JSON, nullable=True),
        default=None,
        description="Array of layout definitions for custom templates. System templates read from filesystem.",
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
    created_by_id: Optional[uuid.UUID] = Field(
        default=None,
        description="User ID who created this template (for custom templates)",
    )
