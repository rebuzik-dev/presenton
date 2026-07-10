"""
Utility to resolve a template layout by name (slug).
First checks the database for custom templates, then falls back to Next.js for system templates.
"""

import aiohttp
import os
import uuid
from typing import Any, Optional
from urllib.parse import urlencode

from fastapi import HTTPException
from models.presentation_layout import PresentationLayoutModel
from services.template_service import template_service
from services.template_prompt_profile_service import template_prompt_profile_service
from utils.template_prompt_overrides import apply_prompt_profile_to_layout


_PROMPT_PROFILE_UNSET = object()


def _builtin_template_exists(layout_name: str) -> bool:
    if not layout_name or layout_name.startswith("custom-"):
        return False
    if "/" in layout_name or "\\" in layout_name or layout_name in {".", ".."}:
        return False

    service_dir = os.path.dirname(__file__)
    candidates = [
        os.path.abspath(
            os.path.join(
                service_dir,
                "..",
                "..",
                "nextjs",
                "app",
                "presentation-templates",
                layout_name,
            )
        ),
        os.path.abspath(
            os.path.join(
                service_dir,
                "..",
                "..",
                "nextjs",
                "presentation-templates",
                layout_name,
            )
        ),
        os.path.abspath(
            os.path.join(
                os.getcwd(),
                "..",
                "nextjs",
                "app",
                "presentation-templates",
                layout_name,
            )
        ),
        os.path.abspath(
            os.path.join(
                os.getcwd(),
                "..",
                "nextjs",
                "presentation-templates",
                layout_name,
            )
        ),
    ]
    return any(os.path.isdir(candidate) for candidate in candidates)


def _build_template_api_url(
    layout_name: str,
    auth_token: Optional[str] = None,
    api_key: Optional[str] = None,
) -> str:
    base_url = os.environ.get("NEXTJS_API_URL", "http://localhost:3000").strip().rstrip("/")
    query_params = {"group": layout_name}
    if auth_token:
        query_params["token"] = auth_token
    if api_key:
        query_params["api_key"] = api_key
    return f"{base_url}/api/template?{urlencode(query_params)}"


async def get_layout_by_name(
    layout_name: str,
    ordered: Optional[bool] = None,
    auth_token: Optional[str] = None,
    api_key: Optional[str] = None,
    prompt_profile: Any = _PROMPT_PROFILE_UNSET,
) -> PresentationLayoutModel:
    """
    Get a presentation layout by template slug.
    
    For system templates (is_system=True), fetches from Next.js API.
    For custom templates (is_system=False), builds layout from DB layouts field.
    
    Args:
        layout_name: Template slug (e.g. 'general', 'modern', 'my-custom-template')
        
    Returns:
        PresentationLayoutModel with slide layouts
        
    Raises:
        HTTPException: If template not found
    """
    # First, check if template exists in database
    template = await template_service.get_by_slug(layout_name)

    # Legacy fallback: custom templates were historically referenced as "custom-<uuid>"
    # while metadata was stored by raw UUID.
    if not template and layout_name.startswith("custom-"):
        raw_template_id = layout_name.replace("custom-", "", 1)
        try:
            template = await template_service.get_by_id(uuid.UUID(raw_template_id))
        except ValueError:
            template = None

    if template:
        # System templates: fetch layout from Next.js (it has the TSX components)
        if template.is_system:
            if not _builtin_template_exists(layout_name):
                raise HTTPException(
                    status_code=404,
                    detail=f"Template with slug '{layout_name}' not found",
                )
            # For system templates, trust Next.js settings.json as the source of truth.
            # Only apply explicit request override when `ordered` is provided.
            resolved_ordered = ordered if ordered is not None else None
            layout = await _fetch_layout_from_nextjs(
                layout_name,
                resolved_ordered,
                auth_token=auth_token,
                api_key=api_key,
            )
            return await _apply_prompt_profile(layout_name, layout, prompt_profile)
        
        # Custom templates: prefer DB-backed layouts when available
        if template.layouts:
            layout = _build_layout_from_db(template)
            if ordered is not None:
                layout.ordered = ordered
            return await _apply_prompt_profile(layout_name, layout, prompt_profile)

        # Legacy custom templates store raw layout code in presentation_layout_codes and
        # must be resolved through Next.js schema extraction.
        # For compatibility, legacy schema loading still expects `custom-<template_uuid>` group.
        legacy_group_name = f"custom-{template.id}"
        resolved_ordered = ordered if ordered is not None else template.ordered
        layout = await _fetch_layout_from_nextjs(
            legacy_group_name,
            resolved_ordered,
            auth_token=auth_token,
            api_key=api_key,
        )
        return await _apply_prompt_profile(layout_name, layout, prompt_profile)
    
    if not _builtin_template_exists(layout_name):
        raise HTTPException(
            status_code=404,
            detail=f"Template with slug '{layout_name}' not found",
        )

    # Fallback: try Next.js directly (for backwards compatibility)
    layout = await _fetch_layout_from_nextjs(
        layout_name,
        ordered=ordered,
        auth_token=auth_token,
        api_key=api_key,
    )
    return await _apply_prompt_profile(layout_name, layout, prompt_profile)


async def _fetch_layout_from_nextjs(
    layout_name: str, 
    ordered: Optional[bool] = None,
    auth_token: Optional[str] = None,
    api_key: Optional[str] = None,
) -> PresentationLayoutModel:
    """Fetch layout from Next.js API."""
    url = _build_template_api_url(
        layout_name,
        auth_token=auth_token,
        api_key=api_key,
    )
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
            if response.status != 200:
                error_text = await response.text()
                raise HTTPException(
                    status_code=404,
                    detail=f"Template '{layout_name}' not found: {error_text}"
                )
            layout_json = await response.json()
    
    layout = PresentationLayoutModel(**layout_json)
    
    # Override ordered setting from DB if provided
    if ordered is not None:
        layout.ordered = ordered
    
    return layout


def _build_layout_from_db(template) -> PresentationLayoutModel:
    """
    Build a PresentationLayoutModel from database template.
    
    This is used for custom templates where layouts are stored in JSON.
    """
    from models.presentation_layout import (
        PresentationLayoutModel,
        SlideLayoutModel,
    )
    
    slides = []
    for idx, layout_item in enumerate(template.layouts or []):
        slide = SlideLayoutModel(
            id=layout_item.get("name", f"slide_{idx}"),
            name=layout_item.get("name", f"Slide {idx}"),
            description=layout_item.get("description", ""),
            # Schema is required - for custom templates it should be present
            json_schema=layout_item.get("schema", {}),
        )
        slides.append(slide)
    
    return PresentationLayoutModel(
        name=template.slug,
        slides=slides,
        ordered=template.ordered,
    )


async def _apply_prompt_profile(
    template_slug: str,
    layout: PresentationLayoutModel,
    prompt_profile: Any = _PROMPT_PROFILE_UNSET,
) -> PresentationLayoutModel:
    profile = prompt_profile
    if profile is _PROMPT_PROFILE_UNSET:
        profile = await template_prompt_profile_service.get_by_slug(template_slug)
    return apply_prompt_profile_to_layout(layout, profile)
