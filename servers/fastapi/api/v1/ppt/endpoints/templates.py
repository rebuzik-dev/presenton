"""
Templates API Endpoints
CRUD operations for presentation templates.
"""

from typing import Any, List, Optional, Tuple
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from services.template_service import template_service
from api.deps import get_current_user_or_api_key
from models.sql.user import UserModel
from utils.get_layout_by_name import get_layout_by_name
from utils.template_image_summary import build_layout_image_summary
from utils.template_schema_summary import build_template_schema_summary
from utils.template_style_summary import build_template_style_summary


TEMPLATES_ROUTER = APIRouter(prefix="/templates", tags=["Templates"])


# --- Request/Response Models ---


class LayoutItemSchema(BaseModel):
    """Schema for a single layout within a template."""
    name: str = Field(..., description="Layout component name")
    file: str = Field(..., description="TSX filename")
    description: Optional[str] = Field(None, description="What this layout is for")
    schema: Optional[dict] = Field(None, description="Zod schema in JSON format")


class TemplateResponse(BaseModel):
    """Template response model."""
    id: UUID
    name: str
    slug: str
    description: Optional[str]
    ordered: bool
    is_default: bool
    is_system: bool
    layouts: Optional[List[dict]]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class CreateTemplateRequest(BaseModel):
    """Request body for creating a custom template."""
    name: str = Field(..., description="Human-readable template name")
    slug: str = Field(..., description="URL-safe identifier (must be unique)")
    description: Optional[str] = Field(None, description="Template description")
    ordered: bool = Field(False, description="Use strict layout ordering")
    layouts: Optional[List[LayoutItemSchema]] = Field(None, description="Layout definitions")


class UpdateTemplateRequest(BaseModel):
    """Request body for updating a custom template."""
    name: Optional[str] = Field(None, description="Human-readable template name")
    description: Optional[str] = Field(None, description="Template description")
    ordered: Optional[bool] = Field(None, description="Use strict layout ordering")
    layouts: Optional[List[LayoutItemSchema]] = Field(None, description="Layout definitions")


class SeedResponse(BaseModel):
    """Response from seed operation."""
    count: int
    message: str


class SlideImageSummaryResponse(BaseModel):
    """Image-slot summary for one slide layout."""

    index: int
    layout_id: str
    layout_name: Optional[str] = None
    schema_title: Optional[str] = None
    slide_description: str
    image_prompt_slots: int
    count_is_approximate: bool = False


class TemplateImageSummaryResponse(BaseModel):
    """Template-level image-slot summary."""

    template: str
    ordered: bool
    total_image_prompt_slots: int
    slides: List[SlideImageSummaryResponse]


class StyleColorBindingResponse(BaseModel):
    block_id: str
    property: str
    slide_color_token: Optional[str] = None


class StyleFontBindingResponse(BaseModel):
    block_id: str
    slide_font_token: Optional[str] = None


class LayoutStyleSummaryResponse(BaseModel):
    layout_id: str
    source_file: str
    color_bindings: List[StyleColorBindingResponse]
    font_bindings: List[StyleFontBindingResponse]
    block_ids: List[str]
    slide_color_tokens: List[str]
    slide_font_tokens: List[str]


class TemplateStyleSummaryResponse(BaseModel):
    template: str
    layout_count: int
    block_ids: List[str]
    slide_color_tokens: List[str]
    slide_font_tokens: List[str]
    layouts: List[LayoutStyleSummaryResponse]


class ArraySlotSummaryResponse(BaseModel):
    path: str
    min_items: Optional[int] = None
    max_items: Optional[int] = None
    approximate: bool = False


class LayoutContentSlotsResponse(BaseModel):
    image_slots: int
    icon_slots: int
    array_slots: List[ArraySlotSummaryResponse]


class LayoutRenderHintsResponse(BaseModel):
    visible_items_from_schema: List[ArraySlotSummaryResponse]


class SchemaFieldSummaryResponse(BaseModel):
    path: str
    type: str
    required: bool
    description: Optional[str] = None
    enum_values: Optional[List[Any]] = None
    default: Optional[Any] = None
    constraints: dict[str, Any] = Field(default_factory=dict)
    special_kind: Optional[str] = None


class LayoutSchemaSummaryResponse(BaseModel):
    index: int
    layout_id: str
    layout_name: Optional[str] = None
    layout_description: Optional[str] = None
    source_file: Optional[str] = None
    json_schema: dict[str, Any] = Field(default_factory=dict)
    fields_summary: List[SchemaFieldSummaryResponse]
    content_slots: LayoutContentSlotsResponse
    render_hints: LayoutRenderHintsResponse


class TemplateSchemaSummaryResponse(BaseModel):
    template: str
    ordered: bool
    layout_count: int
    layouts: List[LayoutSchemaSummaryResponse]


def _extract_auth_context(http_request: Request) -> Tuple[Optional[str], Optional[str]]:
    authorization_header = http_request.headers.get("Authorization")
    auth_token = None
    if authorization_header and authorization_header.lower().startswith("bearer "):
        auth_token = authorization_header.split(" ", 1)[1].strip()

    if not auth_token:
        auth_token = (
            http_request.cookies.get("auth_token")
            or http_request.query_params.get("token")
        )

    api_key = (
        http_request.headers.get("X-API-Key")
        or http_request.query_params.get("api_key")
    )
    return auth_token, api_key


# --- Endpoints ---


@TEMPLATES_ROUTER.get("", response_model=List[TemplateResponse])
async def list_templates(
    include_system: bool = True,
    include_custom: bool = True,
):
    """
    List all available templates.

    - **include_system**: Include built-in templates (default: true)
    - **include_custom**: Include user-created templates (default: true)
    """
    templates = await template_service.list_templates(
        include_system=include_system,
        include_custom=include_custom,
    )
    return [
        TemplateResponse(
            id=t.id,
            name=t.name,
            slug=t.slug,
            description=t.description,
            ordered=t.ordered,
            is_default=t.is_default,
            is_system=t.is_system,
            layouts=t.layouts,
            created_at=t.created_at.isoformat(),
            updated_at=t.updated_at.isoformat(),
        )
        for t in templates
    ]


@TEMPLATES_ROUTER.get("/{slug}", response_model=TemplateResponse)
async def get_template_by_slug(slug: str):
    """
    Get a template by its slug.

    - **slug**: URL-safe identifier (e.g. 'general', 'modern', 'my-custom-template')
    """
    template = await template_service.get_by_slug(slug)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with slug '{slug}' not found",
        )
    return TemplateResponse(
        id=template.id,
        name=template.name,
        slug=template.slug,
        description=template.description,
        ordered=template.ordered,
        is_default=template.is_default,
        is_system=template.is_system,
        layouts=template.layouts,
        created_at=template.created_at.isoformat(),
        updated_at=template.updated_at.isoformat(),
    )


@TEMPLATES_ROUTER.get(
    "/{slug}/image-summary",
    response_model=TemplateImageSummaryResponse,
)
async def get_template_image_summary(slug: str, http_request: Request):
    """
    Get image-generation slot summary for a template.

    Returns per-layout image prompt slot counts and short slide descriptions.
    """
    auth_token, api_key = _extract_auth_context(http_request)
    layout = await get_layout_by_name(
        slug,
        auth_token=auth_token,
        api_key=api_key,
    )

    return TemplateImageSummaryResponse(
        **build_layout_image_summary(slug, layout)
    )


@TEMPLATES_ROUTER.get(
    "/{slug}/style-summary",
    response_model=TemplateStyleSummaryResponse,
)
async def get_template_style_summary(slug: str):
    """
    Get style-contract summary for a template.

    The response is extracted from template TSX files by collecting:
    - block IDs used in resolveColor/resolveFontFamily
    - slide-level token names (colors/fonts)
    """
    template = await template_service.get_by_slug(slug)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with slug '{slug}' not found",
        )

    try:
        summary = build_template_style_summary(slug)
        return TemplateStyleSummaryResponse(**summary)
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@TEMPLATES_ROUTER.get(
    "/{slug}/schema-summary",
    response_model=TemplateSchemaSummaryResponse,
)
async def get_template_schema_summary(slug: str, http_request: Request):
    """
    Get content-schema summary for a template.

    Returns full JSON schema, flattened field summary, and generic render hints.
    """
    auth_token, api_key = _extract_auth_context(http_request)
    template = await template_service.get_by_slug(slug)
    layout = await get_layout_by_name(
        slug,
        auth_token=auth_token,
        api_key=api_key,
    )

    summary = build_template_schema_summary(
        slug,
        layout,
        template.layouts if template else None,
    )
    return TemplateSchemaSummaryResponse(**summary)


@TEMPLATES_ROUTER.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    request: CreateTemplateRequest,
    current_user: UserModel = Depends(get_current_user_or_api_key),
):
    """
    Create a new custom template.

    Custom templates can be used in API calls with their slug.
    """
    try:
        layouts_dict = None
        if request.layouts:
            layouts_dict = [l.model_dump() for l in request.layouts]

        template = await template_service.create_custom(
            name=request.name,
            slug=request.slug,
            description=request.description,
            ordered=request.ordered,
            layouts=layouts_dict,
            created_by_id=current_user.id,
        )
        return TemplateResponse(
            id=template.id,
            name=template.name,
            slug=template.slug,
            description=template.description,
            ordered=template.ordered,
            is_default=template.is_default,
            is_system=template.is_system,
            layouts=template.layouts,
            created_at=template.created_at.isoformat(),
            updated_at=template.updated_at.isoformat(),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@TEMPLATES_ROUTER.put("/{template_id}", response_model=TemplateResponse)
async def update_template(template_id: UUID, request: UpdateTemplateRequest):
    """
    Update a custom template.

    System templates cannot be modified.
    """
    try:
        layouts_dict = None
        if request.layouts:
            layouts_dict = [l.model_dump() for l in request.layouts]

        template = await template_service.update_custom(
            template_id=template_id,
            name=request.name,
            description=request.description,
            ordered=request.ordered,
            layouts=layouts_dict,
        )
        return TemplateResponse(
            id=template.id,
            name=template.name,
            slug=template.slug,
            description=template.description,
            ordered=template.ordered,
            is_default=template.is_default,
            is_system=template.is_system,
            layouts=template.layouts,
            created_at=template.created_at.isoformat(),
            updated_at=template.updated_at.isoformat(),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@TEMPLATES_ROUTER.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(template_id: UUID):
    """
    Delete a custom template.

    System templates cannot be deleted.
    """
    try:
        await template_service.delete_custom(template_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@TEMPLATES_ROUTER.post("/seed", response_model=SeedResponse)
async def seed_system_templates():
    """
    Seed/refresh system templates from filesystem.

    This reads template settings from Next.js presentation-templates directory
    and creates/updates records in the database.
    """
    count = await template_service.seed_system_templates()
    return SeedResponse(
        count=count,
        message=f"Successfully seeded {count} system templates",
    )
