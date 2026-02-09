"""
Templates API Endpoints
CRUD operations for presentation templates.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from services.template_service import template_service
from api.deps import get_current_user_or_api_key
from models.sql.user import UserModel


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
