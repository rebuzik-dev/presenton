from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class SlideOutlineModel(BaseModel):
    content: str
    image_prompt: Optional[str] = None
    reference_image_source: Optional[str] = None
    style: Optional[Dict[str, Any]] = None


class PresentationOutlineModel(BaseModel):
    slides: List[SlideOutlineModel]

    def to_string(self):
        message = ""
        for i, slide in enumerate(self.slides):
            message += f"## Slide {i+1}:\n"
            message += f"  - Content: {slide.content} \n"
        return message
