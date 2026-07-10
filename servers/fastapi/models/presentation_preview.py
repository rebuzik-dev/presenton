from datetime import datetime
from typing import Literal, Optional
import uuid

from pydantic import BaseModel, Field


class SlidePreviewManifestItem(BaseModel):
    index: int
    title: str
    path: Optional[str] = None
    revision: str
    updated_at: Optional[datetime] = None


class PresentationPreviewManifest(BaseModel):
    presentation_id: uuid.UUID
    revision: str
    state: Literal["missing", "stale", "rendering", "ready", "error"]
    slides: list[SlidePreviewManifestItem] = Field(default_factory=list)
    updated_at: Optional[datetime] = None
    warnings: list[str] = Field(default_factory=list)
