"""seed universal template prompt profiles

Revision ID: 8b2f1d6c4e9a
Revises: 2e1c9b8f74d1, c7b70d0f31b1
Create Date: 2026-07-12 09:00:00.000000

"""

from datetime import datetime, timezone
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa

from utils.universal_template_prompt_profiles import (
    UNIVERSAL_TEMPLATE_PROMPTS,
    merge_universal_prompt_profile,
)


revision: str = "8b2f1d6c4e9a"
down_revision: Union[str, Sequence[str], None] = (
    "2e1c9b8f74d1",
    "c7b70d0f31b1",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if "template_prompt_profiles" not in sa.inspect(bind).get_table_names():
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
    rows = {
        row.template_slug: row
        for row in bind.execute(
            sa.select(profiles).where(
                profiles.c.template_slug.in_(tuple(UNIVERSAL_TEMPLATE_PROMPTS))
            )
        ).mappings()
    }
    now = datetime.now(timezone.utc)

    for template_slug, default_prompt in UNIVERSAL_TEMPLATE_PROMPTS.items():
        row = rows.get(template_slug)
        if row is None:
            bind.execute(
                profiles.insert().values(
                    id=uuid.uuid4(),
                    template_slug=template_slug,
                    template_id=None,
                    is_active=True,
                    template_prompt=default_prompt,
                    layout_prompts={},
                    created_at=now,
                    updated_at=now,
                    created_by_id=None,
                )
            )
            continue

        template_prompt, layout_prompts, changed = merge_universal_prompt_profile(
            template_slug=template_slug,
            template_prompt=row.template_prompt,
            layout_prompts=row.layout_prompts,
        )
        if changed:
            bind.execute(
                profiles.update()
                .where(profiles.c.id == row.id)
                .values(
                    template_prompt=template_prompt,
                    layout_prompts=layout_prompts,
                    updated_at=now,
                )
            )


def downgrade() -> None:
    # Prompt profiles are user-editable data. A downgrade must not delete or rewrite
    # values that could have been changed after this migration was applied.
    pass
