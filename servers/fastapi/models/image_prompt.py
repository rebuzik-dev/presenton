from typing import Optional
from pydantic import BaseModel, Field


class ImagePrompt(BaseModel):
    prompt: str
    theme_prompt: Optional[str] = None
    reference_images: list[str] = Field(default_factory=list)

    def get_image_prompt(self, with_theme: bool = False) -> str:
        if with_theme and self.theme_prompt:
            return f"{self.prompt}, {self.theme_prompt}"
        return self.prompt
