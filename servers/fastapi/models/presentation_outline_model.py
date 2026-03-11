import json
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, field_validator


class SlideOutlineModel(BaseModel):
    content: str
    image_prompt: Optional[str] = None
    reference_image_source: Optional[str] = None
    style: Optional[Dict[str, Any]] = None

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

    def to_string(self):
        message = ""
        for i, slide in enumerate(self.slides):
            message += f"## Slide {i+1}:\n"
            message += f"  - Content: {slide.content} \n"
        return message
