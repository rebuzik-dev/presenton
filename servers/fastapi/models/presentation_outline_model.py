import json
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class SlideImageBrief(BaseModel):
    slot_index: int = Field(ge=0)
    label: str = Field(min_length=1)
    prompt: str = Field(min_length=1)


class ImagePalette(BaseModel):
    primary: List[str] = Field(default_factory=list)
    secondary: List[str] = Field(default_factory=list)


class PresentationImageStyle(BaseModel):
    style: str = ""
    mood: str = ""
    lighting: str = ""
    composition_rules: str = ""
    consistency_rules: List[str] = Field(default_factory=list)
    palette: Optional[ImagePalette] = None


class SlideOutlineModel(BaseModel):
    content: str
    image_prompt: Optional[str] = None
    image_briefs: List[SlideImageBrief] = Field(default_factory=list)
    reference_image_source: Optional[str] = None
    style: Optional[Dict[str, Any]] = None

    @field_validator("image_briefs")
    @classmethod
    def validate_image_briefs(cls, value: List[SlideImageBrief]) -> List[SlideImageBrief]:
        ordered = sorted(value, key=lambda item: item.slot_index)
        if [item.slot_index for item in ordered] != list(range(len(ordered))):
            raise ValueError("image_briefs slot_index values must be contiguous and 0-based")
        return ordered

    @field_validator("style", mode="before")
    @classmethod
    def parse_stringified_style(cls, value):
        if value is None or isinstance(value, dict):
            return value

        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return None

            try:
                parsed = json.loads(stripped)
            except Exception:
                return None

            return dict(parsed) if isinstance(parsed, dict) else None

        return value


class PresentationOutlineModel(BaseModel):
    slides: List[SlideOutlineModel]
    image_style: Optional[PresentationImageStyle] = None

    def to_string(self):
        message = ""
        for i, slide in enumerate(self.slides):
            message += f"## Slide {i+1}:\n"
            message += f"  - Content: {slide.content} \n"
        return message
