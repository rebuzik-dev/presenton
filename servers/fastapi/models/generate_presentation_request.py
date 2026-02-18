from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field

from enums.tone import Tone
from enums.verbosity import Verbosity


class GeneratePresentationRequest(BaseModel):
    class SlideMarkdownInput(BaseModel):
        content: str = Field(..., description="Markdown content for one slide")
        image_prompt: Optional[str] = Field(
            default=None,
            description="Optional user-provided image guidance for the slide",
        )
        reference_image_source: Optional[str] = Field(
            default=None,
            description="Optional reference image source (URL/path/data URL) for the slide",
        )
        style: Optional[Dict[str, Any]] = Field(
            default=None,
            description="Optional style payload for this slide. Supports slide-level tokens and block-level overrides.",
        )

    content: str = Field(..., description="The content for generating the presentation")
    slides_markdown: Optional[List[Union[str, SlideMarkdownInput]]] = Field(
        default=None, description="The markdown for the slides"
    )
    global_reference_image_source: Optional[str] = Field(
        default=None,
        description="Optional global reference image source (URL/path/data URL) applied to slides without slide-level override",
    )
    instructions: Optional[str] = Field(
        default=None, description="The instruction for generating the presentation"
    )
    tone: Tone = Field(default=Tone.DEFAULT, description="The tone to use for the text")
    verbosity: Verbosity = Field(
        default=Verbosity.STANDARD, description="How verbose the presentation should be"
    )
    web_search: bool = Field(default=False, description="Whether to enable web search")
    n_slides: int = Field(default=8, description="Number of slides to generate")
    language: str = Field(
        default="Russian", description="Language for the presentation"
    )
    template: str = Field(
        default="general", description="Template to use for the presentation"
    )
    font: Optional[str] = Field(
        default=None,
        description="Optional font family to apply during rendering/export (e.g. Inter, Montserrat)",
    )
    ordered: Optional[bool] = Field(
        default=None,
        description="Override template layout ordering: true for strict sequence, false for smart selection",
    )
    include_table_of_contents: bool = Field(
        default=False, description="Whether to include a table of contents"
    )
    include_title_slide: bool = Field(
        default=True, description="Whether to include a title slide"
    )
    files: Optional[List[str]] = Field(
        default=None, description="Files to use for the presentation"
    )
    export_as: Literal["pptx", "pdf"] = Field(
        default="pptx", description="Export format"
    )
    trigger_webhook: bool = Field(
        default=False, description="Whether to trigger subscribed webhooks"
    )

    def normalized_slides_markdown(self) -> Optional[List[SlideMarkdownInput]]:
        if self.slides_markdown is None:
            return None

        normalized: List[GeneratePresentationRequest.SlideMarkdownInput] = []
        for slide in self.slides_markdown:
            if isinstance(slide, str):
                normalized.append(
                    GeneratePresentationRequest.SlideMarkdownInput(content=slide)
                )
            else:
                normalized.append(slide)
        return normalized
