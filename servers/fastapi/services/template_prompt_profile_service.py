import uuid
from typing import Any, Optional

from sqlmodel import select

from models.sql.template_prompt_profile import TemplatePromptProfileModel
from services.database import async_session_maker
from utils.datetime_utils import get_current_utc_datetime


class TemplatePromptProfileService:
    async def get_by_slug(self, template_slug: str) -> Optional[TemplatePromptProfileModel]:
        async with async_session_maker() as session:
            result = await session.execute(
                select(TemplatePromptProfileModel).where(
                    TemplatePromptProfileModel.template_slug == template_slug
                )
            )
            return result.scalars().first()

    async def upsert(
        self,
        *,
        template_slug: str,
        template_id: Optional[uuid.UUID],
        template_prompt: Optional[str],
        layout_prompts: dict[str, Any],
        is_active: bool = True,
        created_by_id: Optional[uuid.UUID] = None,
    ) -> TemplatePromptProfileModel:
        async with async_session_maker() as session:
            result = await session.execute(
                select(TemplatePromptProfileModel).where(
                    TemplatePromptProfileModel.template_slug == template_slug
                )
            )
            profile = result.scalars().first()
            now = get_current_utc_datetime()
            if profile:
                profile.template_id = template_id
                profile.template_prompt = template_prompt
                profile.layout_prompts = layout_prompts
                profile.is_active = is_active
                profile.updated_at = now
            else:
                profile = TemplatePromptProfileModel(
                    template_slug=template_slug,
                    template_id=template_id,
                    template_prompt=template_prompt,
                    layout_prompts=layout_prompts,
                    is_active=is_active,
                    created_by_id=created_by_id,
                )
            session.add(profile)
            await session.commit()
            await session.refresh(profile)
            return profile


template_prompt_profile_service = TemplatePromptProfileService()
