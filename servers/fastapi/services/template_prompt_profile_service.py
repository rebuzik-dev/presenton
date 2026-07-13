from copy import deepcopy
from datetime import timezone
import uuid
from typing import Any, Optional

from sqlalchemy import func
from sqlmodel import select

from models.sql.template_prompt_profile import TemplatePromptProfileModel
from models.sql.template_prompt_profile_revision import (
    TemplatePromptProfileRevisionModel,
)
from models.sql.user import UserModel
from services.database import async_session_maker
from utils.datetime_utils import get_current_utc_datetime
from utils.template_prompt_overrides import build_prompt_profile_fingerprint


class PromptProfileConflictError(Exception):
    def __init__(self, current_fingerprint: str):
        super().__init__("The prompt profile changed since it was loaded.")
        self.current_fingerprint = current_fingerprint


class PromptProfileRevisionNotFoundError(Exception):
    pass


def build_prompt_profile_diff(
    before: dict[str, Any],
    after: dict[str, Any],
) -> list[dict[str, Any]]:
    changes: list[dict[str, Any]] = []

    def append_change(
        *,
        scope: str,
        path: str,
        old_value: Any,
        new_value: Any,
        layout_id: Optional[str] = None,
    ) -> None:
        if old_value == new_value:
            return
        if old_value is None:
            action = "added"
        elif new_value is None:
            action = "removed"
        else:
            action = "updated"
        changes.append(
            {
                "scope": scope,
                "layout_id": layout_id,
                "path": path,
                "action": action,
                "before": old_value,
                "after": new_value,
            }
        )

    append_change(
        scope="template",
        path="is_active",
        old_value=before.get("is_active", True),
        new_value=after.get("is_active", True),
    )
    append_change(
        scope="template",
        path="template_prompt",
        old_value=before.get("template_prompt"),
        new_value=after.get("template_prompt"),
    )

    before_layouts = before.get("layout_prompts") or {}
    after_layouts = after.get("layout_prompts") or {}
    for layout_id in sorted(set(before_layouts) | set(after_layouts)):
        before_layout = before_layouts.get(layout_id) or {}
        after_layout = after_layouts.get(layout_id) or {}
        append_change(
            scope="layout",
            layout_id=layout_id,
            path="layout_prompt",
            old_value=before_layout.get("layout_prompt"),
            new_value=after_layout.get("layout_prompt"),
        )

        for scope, key in (
            ("field", "field_prompts"),
            ("image", "image_prompt_overrides"),
        ):
            before_values = before_layout.get(key) or {}
            after_values = after_layout.get(key) or {}
            for path in sorted(set(before_values) | set(after_values)):
                append_change(
                    scope=scope,
                    layout_id=layout_id,
                    path=path,
                    old_value=before_values.get(path),
                    new_value=after_values.get(path),
                )

    return changes


def _profile_snapshot(
    *,
    is_active: bool,
    template_prompt: Optional[str],
    layout_prompts: dict[str, Any] | None,
) -> dict[str, Any]:
    return {
        "is_active": bool(is_active),
        "template_prompt": template_prompt,
        "layout_prompts": deepcopy(layout_prompts or {}),
    }


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
        expected_fingerprint: Optional[str] = None,
    ) -> TemplatePromptProfileModel:
        async with async_session_maker() as session:
            async with session.begin():
                result = await session.execute(
                    select(TemplatePromptProfileModel)
                    .where(TemplatePromptProfileModel.template_slug == template_slug)
                    .with_for_update()
                )
                profile = result.scalars().first()
                before = _profile_snapshot(
                    is_active=profile.is_active if profile else True,
                    template_prompt=profile.template_prompt if profile else None,
                    layout_prompts=profile.layout_prompts if profile else {},
                )
                current_fingerprint = build_prompt_profile_fingerprint(**before)
                if (
                    expected_fingerprint is not None
                    and expected_fingerprint != current_fingerprint
                ):
                    raise PromptProfileConflictError(current_fingerprint)

                after = _profile_snapshot(
                    is_active=is_active,
                    template_prompt=template_prompt,
                    layout_prompts=layout_prompts,
                )
                next_fingerprint = build_prompt_profile_fingerprint(**after)
                if profile and current_fingerprint == next_fingerprint:
                    return profile

                now = get_current_utc_datetime()
                action = "update" if profile else "baseline"
                if profile:
                    profile.template_id = template_id
                    profile.template_prompt = template_prompt
                    profile.layout_prompts = deepcopy(layout_prompts)
                    profile.is_active = is_active
                    profile.updated_at = now
                else:
                    profile = TemplatePromptProfileModel(
                        template_slug=template_slug,
                        template_id=template_id,
                        template_prompt=template_prompt,
                        layout_prompts=deepcopy(layout_prompts),
                        is_active=is_active,
                        created_by_id=created_by_id,
                        created_at=now,
                        updated_at=now,
                    )
                session.add(profile)
                session.add(
                    TemplatePromptProfileRevisionModel(
                        template_slug=template_slug,
                        version=await self._next_version(session, template_slug),
                        fingerprint=next_fingerprint,
                        is_active=is_active,
                        template_prompt=template_prompt,
                        layout_prompts=deepcopy(layout_prompts),
                        action=action,
                        changes=build_prompt_profile_diff(before, after),
                        created_by_id=created_by_id,
                        created_at=now,
                    )
                )

            await session.refresh(profile)
            return profile

    async def list_history(
        self,
        *,
        template_slug: str,
        limit: int,
        offset: int,
    ) -> dict[str, Any]:
        async with async_session_maker() as session:
            profile = await self._get_profile(session, template_slug)
            current_version = await self._get_current_version(session, profile)
            total = (
                await session.execute(
                    select(func.count(TemplatePromptProfileRevisionModel.id)).where(
                        TemplatePromptProfileRevisionModel.template_slug
                        == template_slug
                    )
                )
            ).scalar_one()
            result = await session.execute(
                select(TemplatePromptProfileRevisionModel, UserModel.username)
                .outerjoin(
                    UserModel,
                    UserModel.id
                    == TemplatePromptProfileRevisionModel.created_by_id,
                )
                .where(
                    TemplatePromptProfileRevisionModel.template_slug
                    == template_slug
                )
                .order_by(TemplatePromptProfileRevisionModel.version.desc())
                .offset(offset)
                .limit(limit)
            )
            return {
                "items": [
                    self._serialize_revision(
                        revision,
                        author=author,
                        current_version=current_version,
                        include_snapshot=False,
                    )
                    for revision, author in result.all()
                ],
                "total": total,
                "limit": limit,
                "offset": offset,
            }

    async def get_history_revision(
        self,
        *,
        template_slug: str,
        revision_id: uuid.UUID,
    ) -> dict[str, Any]:
        async with async_session_maker() as session:
            profile = await self._get_profile(session, template_slug)
            current_version = await self._get_current_version(session, profile)
            result = await session.execute(
                select(TemplatePromptProfileRevisionModel, UserModel.username)
                .outerjoin(
                    UserModel,
                    UserModel.id
                    == TemplatePromptProfileRevisionModel.created_by_id,
                )
                .where(
                    TemplatePromptProfileRevisionModel.template_slug
                    == template_slug,
                    TemplatePromptProfileRevisionModel.id == revision_id,
                )
            )
            row = result.first()
            if not row:
                raise PromptProfileRevisionNotFoundError()
            revision, author = row
            return self._serialize_revision(
                revision,
                author=author,
                current_version=current_version,
                include_snapshot=True,
            )

    async def restore(
        self,
        *,
        template_slug: str,
        revision_id: uuid.UUID,
        expected_current_fingerprint: Optional[str],
        restored_by_id: Optional[uuid.UUID],
    ) -> TemplatePromptProfileModel:
        async with async_session_maker() as session:
            async with session.begin():
                revision_result = await session.execute(
                    select(TemplatePromptProfileRevisionModel).where(
                        TemplatePromptProfileRevisionModel.template_slug
                        == template_slug,
                        TemplatePromptProfileRevisionModel.id == revision_id,
                    )
                )
                revision = revision_result.scalars().first()
                if not revision:
                    raise PromptProfileRevisionNotFoundError()

                profile_result = await session.execute(
                    select(TemplatePromptProfileModel)
                    .where(TemplatePromptProfileModel.template_slug == template_slug)
                    .with_for_update()
                )
                profile = profile_result.scalars().first()
                if not profile:
                    raise PromptProfileRevisionNotFoundError()

                before = _profile_snapshot(
                    is_active=profile.is_active,
                    template_prompt=profile.template_prompt,
                    layout_prompts=profile.layout_prompts,
                )
                current_fingerprint = build_prompt_profile_fingerprint(**before)
                if (
                    expected_current_fingerprint is not None
                    and expected_current_fingerprint != current_fingerprint
                ):
                    raise PromptProfileConflictError(current_fingerprint)

                after = _profile_snapshot(
                    is_active=revision.is_active,
                    template_prompt=revision.template_prompt,
                    layout_prompts=revision.layout_prompts,
                )
                restored_fingerprint = build_prompt_profile_fingerprint(**after)
                if restored_fingerprint == current_fingerprint:
                    return profile

                now = get_current_utc_datetime()
                profile.is_active = revision.is_active
                profile.template_prompt = revision.template_prompt
                profile.layout_prompts = deepcopy(revision.layout_prompts or {})
                profile.updated_at = now
                session.add(profile)
                session.add(
                    TemplatePromptProfileRevisionModel(
                        template_slug=template_slug,
                        version=await self._next_version(session, template_slug),
                        fingerprint=restored_fingerprint,
                        is_active=revision.is_active,
                        template_prompt=revision.template_prompt,
                        layout_prompts=deepcopy(revision.layout_prompts or {}),
                        action="restore",
                        changes=build_prompt_profile_diff(before, after),
                        restored_from_revision_id=revision.id,
                        created_by_id=restored_by_id,
                        created_at=now,
                    )
                )

            await session.refresh(profile)
            return profile

    async def _next_version(self, session, template_slug: str) -> int:
        result = await session.execute(
            select(func.max(TemplatePromptProfileRevisionModel.version)).where(
                TemplatePromptProfileRevisionModel.template_slug == template_slug
            )
        )
        return int(result.scalar_one_or_none() or 0) + 1

    async def _get_profile(self, session, template_slug: str):
        result = await session.execute(
            select(TemplatePromptProfileModel).where(
                TemplatePromptProfileModel.template_slug == template_slug
            )
        )
        return result.scalars().first()

    async def _get_current_version(self, session, profile) -> Optional[int]:
        if not profile:
            return None
        fingerprint = build_prompt_profile_fingerprint(
            is_active=profile.is_active,
            template_prompt=profile.template_prompt,
            layout_prompts=profile.layout_prompts,
        )
        result = await session.execute(
            select(func.max(TemplatePromptProfileRevisionModel.version)).where(
                TemplatePromptProfileRevisionModel.template_slug
                == profile.template_slug,
                TemplatePromptProfileRevisionModel.fingerprint == fingerprint,
            )
        )
        return result.scalar_one_or_none()

    def _serialize_revision(
        self,
        revision: TemplatePromptProfileRevisionModel,
        *,
        author: Optional[str],
        current_version: Optional[int],
        include_snapshot: bool,
    ) -> dict[str, Any]:
        changes = deepcopy(revision.changes or [])
        changed_layout_ids = sorted(
            {
                change.get("layout_id")
                for change in changes
                if change.get("layout_id")
            }
        )
        created_at = revision.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        result = {
            "revision_id": revision.id,
            "version": revision.version,
            "fingerprint": revision.fingerprint,
            "action": revision.action,
            "change_count": len(changes),
            "changed_layout_ids": changed_layout_ids,
            "author": author,
            "created_at": created_at,
            "is_current": revision.version == current_version,
            "restored_from_revision_id": revision.restored_from_revision_id,
        }
        if include_snapshot:
            result["changes"] = changes
            result["snapshot"] = _profile_snapshot(
                is_active=revision.is_active,
                template_prompt=revision.template_prompt,
                layout_prompts=revision.layout_prompts,
            )
        return result


template_prompt_profile_service = TemplatePromptProfileService()
