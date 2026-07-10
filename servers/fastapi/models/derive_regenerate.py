from typing import Annotated
import uuid

from pydantic import BaseModel, Field, field_validator


class DeriveRegenerateRequest(BaseModel):
    request_id: uuid.UUID
    slide_indices: list[Annotated[int, Field(strict=True, ge=0)]] = Field(
        min_length=1
    )

    @field_validator("slide_indices")
    @classmethod
    def validate_unique_indices(cls, value: list[int]) -> list[int]:
        if len(value) != len(set(value)):
            raise ValueError("slide_indices must be unique")
        return sorted(value)


class DeriveRegenerateResponse(BaseModel):
    presentation_id: uuid.UUID
    status: str
    message: str | None = None
    poll_url: str
