"""
Template Service
Handles CRUD operations for presentation templates and seeding system templates.
"""

import logging
import os
from typing import List, Optional
import uuid

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from models.sql.template import TemplateModel
from services.database import async_session_maker


logger = logging.getLogger(__name__)


class TemplateService:
    """Service for managing presentation templates."""

    # System template definitions (name -> slug mapping)
    SYSTEM_TEMPLATES = {
        "general": {
            "name": "General",
            "description": "General purpose layouts for common presentation elements",
            "ordered": False,
            "is_default": True,
        },
        "modern": {
            "name": "Modern",
            "description": "Modern pitch deck style layouts",
            "ordered": False,
            "is_default": False,
        },
        "standard": {
            "name": "Standard",
            "description": "Standard business presentation layouts",
            "ordered": False,
            "is_default": False,
        },
        "swift": {
            "name": "Swift",
            "description": "Quick and dynamic presentation layouts",
            "ordered": False,
            "is_default": False,
        },
    }

    async def list_templates(
        self, include_system: bool = True, include_custom: bool = True
    ) -> List[TemplateModel]:
        """
        List all available templates.

        Args:
            include_system: Include built-in templates
            include_custom: Include user-created custom templates

        Returns:
            List of TemplateModel objects
        """
        async with async_session_maker() as session:
            statement = select(TemplateModel)

            if not include_system and include_custom:
                statement = statement.where(TemplateModel.is_system == False)
            elif include_system and not include_custom:
                statement = statement.where(TemplateModel.is_system == True)

            result = await session.exec(statement)
            templates = result.all()
            return list(templates)

    async def get_by_id(self, template_id: uuid.UUID) -> Optional[TemplateModel]:
        """Get template by ID."""
        async with async_session_maker() as session:
            statement = select(TemplateModel).where(TemplateModel.id == template_id)
            result = await session.exec(statement)
            return result.first()

    async def get_by_slug(self, slug: str) -> Optional[TemplateModel]:
        """
        Get template by slug.

        Args:
            slug: URL-safe identifier (e.g. 'general', 'my-custom-template')

        Returns:
            TemplateModel or None if not found
        """
        async with async_session_maker() as session:
            statement = select(TemplateModel).where(TemplateModel.slug == slug)
            result = await session.exec(statement)
            return result.first()

    async def get_default_template(self) -> Optional[TemplateModel]:
        """Get the default template (for fallback)."""
        async with async_session_maker() as session:
            statement = select(TemplateModel).where(TemplateModel.is_default == True)
            result = await session.exec(statement)
            template = result.first()
            if not template:
                # Fallback to 'general' if no default is set
                template = await self.get_by_slug("general")
            return template

    async def create_custom(
        self,
        name: str,
        slug: str,
        description: Optional[str] = None,
        ordered: bool = False,
        layouts: Optional[List[dict]] = None,
        created_by_id: Optional[uuid.UUID] = None,
    ) -> TemplateModel:
        """
        Create a new custom template.

        Args:
            name: Human-readable name
            slug: URL-safe identifier (must be unique)
            description: Optional description
            ordered: Whether to use strict layout ordering
            layouts: Array of layout definitions
            created_by_id: User ID who created this template

        Returns:
            Created TemplateModel

        Raises:
            ValueError: If slug already exists
        """
        # Check if slug already exists
        existing = await self.get_by_slug(slug)
        if existing:
            raise ValueError(f"Template with slug '{slug}' already exists")

        template = TemplateModel(
            name=name,
            slug=slug,
            description=description,
            ordered=ordered,
            is_default=False,
            is_system=False,
            layouts=layouts,
            created_by_id=created_by_id,
        )

        async with async_session_maker() as session:
            session.add(template)
            await session.commit()
            await session.refresh(template)
            logger.info(f"Created custom template: {slug} (id={template.id})")
            return template

    async def update_custom(
        self,
        template_id: uuid.UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
        ordered: Optional[bool] = None,
        layouts: Optional[List[dict]] = None,
    ) -> TemplateModel:
        """
        Update a custom template.

        Args:
            template_id: Template UUID
            name, description, ordered, layouts: Fields to update

        Returns:
            Updated TemplateModel

        Raises:
            ValueError: If template not found or is a system template
        """
        async with async_session_maker() as session:
            template = await session.get(TemplateModel, template_id)
            if not template:
                raise ValueError(f"Template not found: {template_id}")
            if template.is_system:
                raise ValueError("Cannot modify system templates")

            if name is not None:
                template.name = name
            if description is not None:
                template.description = description
            if ordered is not None:
                template.ordered = ordered
            if layouts is not None:
                template.layouts = layouts

            session.add(template)
            await session.commit()
            await session.refresh(template)
            logger.info(f"Updated custom template: {template.slug} (id={template.id})")
            return template

    async def delete_custom(self, template_id: uuid.UUID) -> None:
        """
        Delete a custom template.

        Args:
            template_id: Template UUID

        Raises:
            ValueError: If template not found or is a system template
        """
        async with async_session_maker() as session:
            template = await session.get(TemplateModel, template_id)
            if not template:
                raise ValueError(f"Template not found: {template_id}")
            if template.is_system:
                raise ValueError("Cannot delete system templates")

            await session.delete(template)
            await session.commit()
            logger.info(f"Deleted custom template: {template.slug} (id={template_id})")

    async def seed_system_templates(self) -> int:
        """
        Seed/update system templates from filesystem.
        This reads settings.json from each template directory and creates/updates DB records.

        Returns:
            Number of templates seeded/updated
        """
        count = 0
        nextjs_url = os.environ.get("NEXTJS_API_URL", "http://localhost:3000")

        try:
            # Fetch template info from Next.js API
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{nextjs_url}/api/templates")
                response.raise_for_status()
                templates_from_fs = response.json()
        except Exception as e:
            logger.warning(f"Failed to fetch templates from Next.js: {e}")
            # Fallback to hardcoded definitions
            templates_from_fs = []
            for slug, info in self.SYSTEM_TEMPLATES.items():
                templates_from_fs.append({
                    "templateID": slug,
                    "templateName": slug,
                    "files": [],
                    "settings": {
                        "description": info["description"],
                        "ordered": info["ordered"],
                        "default": info["is_default"],
                    },
                })

        async with async_session_maker() as session:
            for tpl_info in templates_from_fs:
                slug = tpl_info.get("templateID", tpl_info.get("templateName"))
                if not slug:
                    continue

                # Check if already exists
                result = await session.exec(
                    select(TemplateModel).where(TemplateModel.slug == slug)
                )
                existing = result.first()

                settings = tpl_info.get("settings") or {}

                # Get name from our mapping or use slug
                system_info = self.SYSTEM_TEMPLATES.get(slug, {})
                name = system_info.get("name", slug.capitalize())
                description = settings.get("description", system_info.get("description"))
                ordered = settings.get("ordered", system_info.get("ordered", False))
                is_default = settings.get("default", system_info.get("is_default", False))

                # Build layouts array from files
                layouts = []
                for file in tpl_info.get("files", []):
                    layout_name = file.replace(".tsx", "")
                    layouts.append({
                        "name": layout_name,
                        "file": file,
                        "description": None,
                        "schema": None,
                    })

                if existing:
                    # Update existing system template
                    existing.name = name
                    existing.description = description
                    existing.ordered = ordered
                    existing.is_default = is_default
                    existing.layouts = layouts if layouts else None
                    session.add(existing)
                    logger.debug(f"Updated system template: {slug}")
                else:
                    # Create new system template
                    template = TemplateModel(
                        name=name,
                        slug=slug,
                        description=description,
                        ordered=ordered,
                        is_default=is_default,
                        is_system=True,
                        layouts=layouts if layouts else None,
                    )
                    session.add(template)
                    logger.info(f"Seeded system template: {slug}")

                count += 1

            await session.commit()

        logger.info(f"Seeded {count} system templates")
        return count


# Singleton instance
template_service = TemplateService()
