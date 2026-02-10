"""
Utility to resolve a template layout by name (slug).
First checks the database for custom templates, then falls back to Next.js for system templates.
"""

import aiohttp
import os
import uuid
from typing import Optional
from urllib.parse import urlencode

from fastapi import HTTPException
from models.presentation_layout import PresentationLayoutModel
from services.template_service import template_service


async def get_layout_by_name(
    layout_name: str,
    auth_token: Optional[str] = None,
    api_key: Optional[str] = None,
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
            return await _fetch_layout_from_nextjs(
                layout_name,
                template.ordered,
                auth_token=auth_token,
                api_key=api_key,
            )
        
        # Custom templates: prefer DB-backed layouts when available
        if template.layouts:
            return _build_layout_from_db(template)

        # Legacy custom templates store raw layout code in presentation_layout_codes and
        # must be resolved through Next.js schema extraction.
        # For compatibility, legacy schema loading still expects `custom-<template_uuid>` group.
        legacy_group_name = f"custom-{template.id}"
        return await _fetch_layout_from_nextjs(
            legacy_group_name,
            template.ordered,
            auth_token=auth_token,
            api_key=api_key,
        )
    
    # Fallback: try Next.js directly (for backwards compatibility)
    return await _fetch_layout_from_nextjs(
        layout_name,
        auth_token=auth_token,
        api_key=api_key,
    )


async def _fetch_layout_from_nextjs(
    layout_name: str, 
    ordered: Optional[bool] = None,
    auth_token: Optional[str] = None,
    api_key: Optional[str] = None,
) -> PresentationLayoutModel:
    """Fetch layout from Next.js API."""
    base_url = os.environ.get("NEXTJS_API_URL", "http://localhost:3000")
    query_params = {"group": layout_name}
    if auth_token:
        query_params["token"] = auth_token
    if api_key:
        query_params["api_key"] = api_key
    url = f"{base_url}/api/template?{urlencode(query_params)}"
    
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
