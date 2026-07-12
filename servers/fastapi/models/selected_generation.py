from __future__ import annotations

from typing import Annotated, Any, Optional
import uuid

from pydantic import BaseModel, Field, field_validator, model_validator

from enums.tone import Tone
from enums.verbosity import Verbosity
from models.presentation_outline_model import PresentationImageStyle, SlideImageBrief


class SlideMarkdownInput(BaseModel):
    content: str = Field(..., min_length=1)
    image_prompt: Optional[str] = None
    image_briefs: list[SlideImageBrief] = Field(default_factory=list)
    reference_image_source: Optional[str] = None
    style: Optional[dict[str, Any]] = None


class IndexedSlideMarkdownInput(SlideMarkdownInput):
    index: Annotated[int, Field(strict=True, ge=0)]


class GenerateSelectedSlidesRequest(BaseModel):
    request_id: uuid.UUID
    template: str = Field(..., min_length=1)
    slides_markdown: list[SlideMarkdownInput] = Field(min_length=1)
    slide_indices: list[Annotated[int, Field(strict=True, ge=0)]] = Field(
        min_length=1
    )
    language: str = "Russian"
    instructions: Optional[str] = None
    ordered: Optional[bool] = None
    font: Optional[str] = None
    tone: Tone = Tone.DEFAULT
    verbosity: Verbosity = Verbosity.STANDARD
    image_style: Optional[PresentationImageStyle] = None

    @field_validator("slide_indices")
    @classmethod
    def validate_unique_indices(cls, value: list[int]) -> list[int]:
        if len(value) != len(set(value)):
            raise ValueError("slide_indices must be unique")
        return sorted(value)

    @model_validator(mode="after")
    def validate_indices_within_deck(self):
        if any(index >= len(self.slides_markdown) for index in self.slide_indices):
            raise ValueError("slide_indices must be within slides_markdown")
        return self


class GenerateSelectedSlidesResponse(BaseModel):
    presentation_id: uuid.UUID
    status: str
    message: Optional[str] = None
    poll_url: str
