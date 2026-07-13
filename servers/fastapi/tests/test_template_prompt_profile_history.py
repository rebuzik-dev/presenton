import asyncio
from datetime import datetime

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel, select

from models.sql.template_prompt_profile import TemplatePromptProfileModel
from models.sql.template_prompt_profile_revision import (
    TemplatePromptProfileRevisionModel,
)
from models.sql.user import UserModel
from services.template_prompt_profile_service import (
    PromptProfileConflictError,
    TemplatePromptProfileService,
    build_prompt_profile_diff,
)
from utils.template_prompt_overrides import build_prompt_profile_fingerprint


def test_prompt_profile_diff_covers_template_layout_field_and_image_scopes():
    changes = build_prompt_profile_diff(
        {
            "is_active": True,
            "template_prompt": "Old template",
            "layout_prompts": {
                "hero": {
                    "layout_prompt": "Old layout",
                    "field_prompts": {"title": "Old title", "subtitle": "Remove"},
                    "image_prompt_overrides": {"image": "Old image"},
                }
            },
        },
        {
            "is_active": False,
            "template_prompt": "New template",
            "layout_prompts": {
                "hero": {
                    "layout_prompt": "New layout",
                    "field_prompts": {"title": "New title", "body": "Add"},
                    "image_prompt_overrides": {"image": "New image"},
                }
            },
        },
    )

    assert {(change["scope"], change["path"], change["action"]) for change in changes} == {
        ("template", "is_active", "updated"),
        ("template", "template_prompt", "updated"),
        ("layout", "layout_prompt", "updated"),
        ("field", "body", "added"),
        ("field", "subtitle", "removed"),
        ("field", "title", "updated"),
        ("image", "image", "updated"),
    }


async def _exercise_prompt_profile_history_noop_conflict_pagination_and_restore(tmp_path, monkeypatch):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'prompt-history.db'}")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(
            lambda sync_connection: SQLModel.metadata.create_all(
                sync_connection,
                tables=[
                    UserModel.__table__,
                    TemplatePromptProfileModel.__table__,
                    TemplatePromptProfileRevisionModel.__table__,
                ],
            )
        )

    monkeypatch.setattr(
        "services.template_prompt_profile_service.async_session_maker",
        session_factory,
    )
    service = TemplatePromptProfileService()
    user = UserModel(
        username="prompt-editor",
        password_hash="not-used",
        role="editor",
    )
    async with session_factory() as session:
        session.add(user)
        await session.commit()
        await session.refresh(user)

    empty_fingerprint = build_prompt_profile_fingerprint()
    first = await service.upsert(
        template_slug="catering",
        template_id=None,
        template_prompt="First prompt",
        layout_prompts={"hero": {"layout_prompt": "First layout"}},
        created_by_id=user.id,
        expected_fingerprint=empty_fingerprint,
    )
    first_fingerprint = build_prompt_profile_fingerprint(
        is_active=first.is_active,
        template_prompt=first.template_prompt,
        layout_prompts=first.layout_prompts,
    )
    original_updated_at = first.updated_at

    noop = await service.upsert(
        template_slug="catering",
        template_id=None,
        template_prompt="First prompt",
        layout_prompts={"hero": {"layout_prompt": "First layout"}},
        created_by_id=user.id,
        expected_fingerprint=first_fingerprint,
    )
    assert noop.updated_at == original_updated_at

    second = await service.upsert(
        template_slug="catering",
        template_id=None,
        template_prompt="Second prompt",
        layout_prompts={
            "hero": {
                "layout_prompt": "Second layout",
                "field_prompts": {"title": "Short title"},
                "image_prompt_overrides": {"image": "Editorial photo"},
            }
        },
        created_by_id=user.id,
        expected_fingerprint=first_fingerprint,
    )
    second_fingerprint = build_prompt_profile_fingerprint(
        is_active=second.is_active,
        template_prompt=second.template_prompt,
        layout_prompts=second.layout_prompts,
    )

    with pytest.raises(PromptProfileConflictError) as conflict:
        await service.upsert(
            template_slug="catering",
            template_id=None,
            template_prompt="Stale write",
            layout_prompts={},
            expected_fingerprint=first_fingerprint,
        )
    assert conflict.value.current_fingerprint == second_fingerprint

    first_page = await service.list_history(
        template_slug="catering",
        limit=1,
        offset=0,
    )
    second_page = await service.list_history(
        template_slug="catering",
        limit=1,
        offset=1,
    )
    assert first_page["total"] == 2
    assert first_page["items"][0]["version"] == 2
    assert first_page["items"][0]["is_current"] is True
    assert first_page["items"][0]["author"] == "prompt-editor"
    assert first_page["items"][0]["created_at"].tzinfo is not None
    assert second_page["items"][0]["version"] == 1

    baseline_revision_id = second_page["items"][0]["revision_id"]
    restored = await service.restore(
        template_slug="catering",
        revision_id=baseline_revision_id,
        expected_current_fingerprint=second_fingerprint,
        restored_by_id=user.id,
    )
    assert restored.template_prompt == "First prompt"
    assert restored.layout_prompts == {"hero": {"layout_prompt": "First layout"}}

    restored_history = await service.list_history(
        template_slug="catering",
        limit=20,
        offset=0,
    )
    assert restored_history["total"] == 3
    assert restored_history["items"][0]["version"] == 3
    assert restored_history["items"][0]["action"] == "restore"
    assert restored_history["items"][0]["is_current"] is True
    assert restored_history["items"][0]["restored_from_revision_id"] == baseline_revision_id

    detail = await service.get_history_revision(
        template_slug="catering",
        revision_id=restored_history["items"][0]["revision_id"],
    )
    assert detail["snapshot"]["template_prompt"] == "First prompt"
    assert {change["scope"] for change in detail["changes"]} == {
        "template",
        "layout",
        "field",
        "image",
    }

    async with session_factory() as session:
        revisions = (
            await session.execute(
                select(TemplatePromptProfileRevisionModel).order_by(
                    TemplatePromptProfileRevisionModel.version
                )
            )
        ).scalars().all()
    assert [revision.version for revision in revisions] == [1, 2, 3]
    assert isinstance(revisions[0].created_at, datetime)

    await engine.dispose()


def test_prompt_profile_history_noop_conflict_pagination_and_restore(tmp_path, monkeypatch):
    asyncio.run(
        _exercise_prompt_profile_history_noop_conflict_pagination_and_restore(
            tmp_path,
            monkeypatch,
        )
    )
