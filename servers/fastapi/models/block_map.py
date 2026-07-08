from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


EditableBlockType = Literal[
    "text",
    "image",
    "group",
    "background",
    "decor",
    "style",
    "layout",
]


class EditableBlockContent(BaseModel):
    text: Optional[str] = None
    image_prompt: Optional[str] = None


class EditableBlockPrompt(BaseModel):
    source: Literal[
        "template_default",
        "template_prompt_profile",
        "override",
        "generated",
    ] = "generated"
    text: Optional[str] = None
    override_text: Optional[str] = None


class EditableSlideBlock(BaseModel):
    block_id: str
    slide_index: int
    layout_id: str
    schema_path: str
    type: EditableBlockType
    semantic_name: str
    description: Optional[str] = None
    content: EditableBlockContent = Field(default_factory=EditableBlockContent)
    prompt: EditableBlockPrompt = Field(default_factory=EditableBlockPrompt)
    debug: dict[str, Any] = Field(default_factory=dict)


class EditableBlockPatchRequest(BaseModel):
    schema_path: str
    semantic_name: Optional[str] = None
    description: Optional[str] = None
    text: Optional[str] = None
    prompt_override: Optional[str] = None
    image_prompt_override: Optional[str] = None
    style_override: Optional[dict[str, Any]] = None


class EditableBlockPatchResponse(BaseModel):
    block: EditableSlideBlock
    block_overrides: dict[str, Any] = Field(default_factory=dict)


class TemplateBlockMapResponse(BaseModel):
    template: str
    blocks: list[EditableSlideBlock]
