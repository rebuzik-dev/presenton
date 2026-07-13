"""add prompt profile history

Revision ID: f6d2b9a13c84
Revises: 8b2f1d6c4e9a
Create Date: 2026-07-13 10:00:00.000000

"""

from datetime import datetime, timezone
import hashlib
import json
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


revision: str = "f6d2b9a13c84"
down_revision: Union[str, None] = "8b2f1d6c4e9a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    return table_name in sa.inspect(op.get_bind()).get_table_names()


def _fingerprint(*, is_active: bool, template_prompt: str | None, layout_prompts: dict) -> str:
    canonical = json.dumps(
        {
            "is_active": bool(is_active),
            "template_prompt": template_prompt,
            "layout_prompts": layout_prompts or {},
        },
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def upgrade() -> None:
    if not _has_table("template_prompt_profile_revisions"):
        op.create_table(
            "template_prompt_profile_revisions",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("template_slug", sa.String(), nullable=False),
            sa.Column("version", sa.Integer(), nullable=False),
            sa.Column("fingerprint", sa.String(length=64), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("template_prompt", sa.String(), nullable=True),
            sa.Column("layout_prompts", sa.JSON(), nullable=False),
            sa.Column("action", sa.String(length=16), nullable=False),
            sa.Column("changes", sa.JSON(), nullable=False),
            sa.Column("restored_from_revision_id", sa.Uuid(), nullable=True),
            sa.Column("created_by_id", sa.Uuid(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "template_slug",
                "version",
                name="uq_template_prompt_profile_revisions_slug_version",
            ),
        )
        op.create_index(
            op.f("ix_template_prompt_profile_revisions_template_slug"),
            "template_prompt_profile_revisions",
            ["template_slug"],
            unique=False,
        )
        op.create_index(
            op.f("ix_template_prompt_profile_revisions_version"),
            "template_prompt_profile_revisions",
            ["version"],
            unique=False,
        )
        op.create_index(
            op.f("ix_template_prompt_profile_revisions_fingerprint"),
            "template_prompt_profile_revisions",
            ["fingerprint"],
            unique=False,
        )
        op.create_index(
            op.f("ix_template_prompt_profile_revisions_restored_from_revision_id"),
            "template_prompt_profile_revisions",
            ["restored_from_revision_id"],
            unique=False,
        )
        op.create_index(
            op.f("ix_template_prompt_profile_revisions_created_by_id"),
            "template_prompt_profile_revisions",
            ["created_by_id"],
            unique=False,
        )

    if not _has_table("template_prompt_profiles"):
        return

    bind = op.get_bind()
    profiles = sa.table(
        "template_prompt_profiles",
        sa.column("template_slug", sa.String()),
        sa.column("is_active", sa.Boolean()),
        sa.column("template_prompt", sa.String()),
        sa.column("layout_prompts", sa.JSON()),
        sa.column("updated_at", sa.DateTime(timezone=True)),
        sa.column("created_by_id", sa.Uuid()),
    )
    revisions = sa.table(
        "template_prompt_profile_revisions",
        sa.column("id", sa.Uuid()),
        sa.column("template_slug", sa.String()),
        sa.column("version", sa.Integer()),
        sa.column("fingerprint", sa.String()),
        sa.column("is_active", sa.Boolean()),
        sa.column("template_prompt", sa.String()),
        sa.column("layout_prompts", sa.JSON()),
        sa.column("action", sa.String()),
        sa.column("changes", sa.JSON()),
        sa.column("restored_from_revision_id", sa.Uuid()),
        sa.column("created_by_id", sa.Uuid()),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )

    existing_slugs = set(
        bind.execute(sa.select(revisions.c.template_slug)).scalars().all()
    )
    now = datetime.now(timezone.utc)
    for profile in bind.execute(sa.select(profiles)).mappings():
        if profile["template_slug"] in existing_slugs:
            continue
        layout_prompts = profile["layout_prompts"] or {}
        bind.execute(
            revisions.insert().values(
                id=uuid.uuid4(),
                template_slug=profile["template_slug"],
                version=1,
                fingerprint=_fingerprint(
                    is_active=bool(profile["is_active"]),
                    template_prompt=profile["template_prompt"],
                    layout_prompts=layout_prompts,
                ),
                is_active=bool(profile["is_active"]),
                template_prompt=profile["template_prompt"],
                layout_prompts=layout_prompts,
                action="baseline",
                changes=[],
                restored_from_revision_id=None,
                created_by_id=profile["created_by_id"],
                created_at=profile["updated_at"] or now,
            )
        )


def downgrade() -> None:
    if not _has_table("template_prompt_profile_revisions"):
        return
    op.drop_index(
        op.f("ix_template_prompt_profile_revisions_created_by_id"),
        table_name="template_prompt_profile_revisions",
    )
    op.drop_index(
        op.f("ix_template_prompt_profile_revisions_restored_from_revision_id"),
        table_name="template_prompt_profile_revisions",
    )
    op.drop_index(
        op.f("ix_template_prompt_profile_revisions_fingerprint"),
        table_name="template_prompt_profile_revisions",
    )
    op.drop_index(
        op.f("ix_template_prompt_profile_revisions_version"),
        table_name="template_prompt_profile_revisions",
    )
    op.drop_index(
        op.f("ix_template_prompt_profile_revisions_template_slug"),
        table_name="template_prompt_profile_revisions",
    )
    op.drop_table("template_prompt_profile_revisions")
