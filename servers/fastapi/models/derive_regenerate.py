from typing import Annotated
import uuid

from pydantic import BaseModel, Field, field_validator, model_validator

from models.selected_generation import IndexedSlideMarkdownInput
from models.presentation_outline_model import PresentationImageStyle


class DeriveRegenerateRequest(BaseModel):
    request_id: uuid.UUID
    slide_indices: list[Annotated[int, Field(strict=True, ge=0)]] = Field(
        min_length=1
    )
    outline_overrides: list[IndexedSlideMarkdownInput] = Field(default_factory=list)
    image_style_override: PresentationImageStyle | None = None

    @field_validator("slide_indices")
    @classmethod
    def validate_unique_indices(cls, value: list[int]) -> list[int]:
        if len(value) != len(set(value)):
            raise ValueError("slide_indices must be unique")
        return sorted(value)

    @field_validator("outline_overrides")
    @classmethod
    def validate_outline_overrides(
        cls,
        value: list[IndexedSlideMarkdownInput],
    ) -> list[IndexedSlideMarkdownInput]:
        indices = [item.index for item in value]
        if len(indices) != len(set(indices)):
            raise ValueError("outline_overrides indices must be unique")
        return sorted(value, key=lambda item: item.index)

    @model_validator(mode="after")
    def validate_override_scope(self):
        selected = set(self.slide_indices)
        if any(item.index not in selected for item in self.outline_overrides):
            raise ValueError("outline_overrides must target selected slide_indices")
        return self


class DeriveRegenerateResponse(BaseModel):
    presentation_id: uuid.UUID
    status: str
    message: str | None = None
    poll_url: str
