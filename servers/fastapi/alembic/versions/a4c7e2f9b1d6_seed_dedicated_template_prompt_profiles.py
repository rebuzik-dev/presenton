"""seed dedicated template prompt profiles

Revision ID: a4c7e2f9b1d6
Revises: f6d2b9a13c84
Create Date: 2026-07-14 10:00:00.000000

"""

from datetime import datetime, timezone
import hashlib
import json
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


revision: str = "a4c7e2f9b1d6"
down_revision: Union[str, None] = "f6d2b9a13c84"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DEDICATED_TEMPLATE_SLUGS = (
    "catering-concept",
    "visual-code-overview",
    "decor-concept",
    "floristry-concept",
    "gift-set-concept",
    "souvenir-concept",
    "video-content-concept",
)


def _fingerprint() -> str:
    canonical = json.dumps(
        {"is_active": True, "template_prompt": None, "layout_prompts": {}},
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def upgrade() -> None:
    bind = op.get_bind()
    table_names = set(sa.inspect(bind).get_table_names())
    if "template_prompt_profiles" not in table_names:
        return

    profiles = sa.table(
        "template_prompt_profiles",
        sa.column("id", sa.Uuid()),
        sa.column("template_slug", sa.String()),
        sa.column("template_id", sa.Uuid()),
        sa.column("is_active", sa.Boolean()),
        sa.column("template_prompt", sa.String()),
        sa.column("layout_prompts", sa.JSON()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
        sa.column("created_by_id", sa.Uuid()),
    )
    existing_profiles = set(
        bind.execute(
            sa.select(profiles.c.template_slug).where(
                profiles.c.template_slug.in_(DEDICATED_TEMPLATE_SLUGS)
            )
        ).scalars()
    )

    revisions = None
    existing_revisions: set[str] = set()
    if "template_prompt_profile_revisions" in table_names:
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
        existing_revisions = set(
            bind.execute(
                sa.select(revisions.c.template_slug).where(
                    revisions.c.template_slug.in_(DEDICATED_TEMPLATE_SLUGS)
                )
            ).scalars()
        )

    now = datetime.now(timezone.utc)
    fingerprint = _fingerprint()
    for template_slug in DEDICATED_TEMPLATE_SLUGS:
        if template_slug not in existing_profiles:
            bind.execute(
                profiles.insert().values(
                    id=uuid.uuid4(),
                    template_slug=template_slug,
                    template_id=None,
                    is_active=True,
                    template_prompt=None,
                    layout_prompts={},
                    created_at=now,
                    updated_at=now,
                    created_by_id=None,
                )
            )
        if revisions is not None and template_slug not in existing_revisions:
            bind.execute(
                revisions.insert().values(
                    id=uuid.uuid4(),
                    template_slug=template_slug,
                    version=1,
                    fingerprint=fingerprint,
                    is_active=True,
                    template_prompt=None,
                    layout_prompts={},
                    action="baseline",
                    changes=[],
                    restored_from_revision_id=None,
                    created_by_id=None,
                    created_at=now,
                )
            )


def downgrade() -> None:
    # Prompt profiles are user-editable data and must survive a code rollback.
    pass
