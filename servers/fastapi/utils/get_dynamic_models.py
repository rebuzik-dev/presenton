from typing import List, Optional

from pydantic import BaseModel, Field
from models.presentation_outline_model import (
    PresentationOutlineModel,
)
from models.presentation_structure_model import PresentationStructureModel


def get_presentation_outline_model_with_n_slides(n_slides: int):
    class SlideOutlineModelWithNSlides(BaseModel):
        content: str = Field(
            description="Markdown content for each slide",
            min_length=100,
            max_length=300,
        )
        image_prompt: Optional[str] = None
        reference_image_source: Optional[str] = None
        style: Optional[str] = Field(
            default=None,
            description="Optional slide style payload encoded as a compact JSON string. Use null if no style overrides are needed.",
        )

    class PresentationOutlineModelWithNSlides(PresentationOutlineModel):
        slides: List[SlideOutlineModelWithNSlides] = Field(
            description="List of slide outlines",
            min_length=n_slides,
            max_length=n_slides,
        )

    return PresentationOutlineModelWithNSlides


def get_presentation_structure_model_with_n_slides(n_slides: int):
    class PresentationStructureModelWithNSlides(PresentationStructureModel):
        slides: List[int] = Field(
            description="List of slide layouts",
            min_length=n_slides,
            max_length=n_slides,
        )

    return PresentationStructureModelWithNSlides
