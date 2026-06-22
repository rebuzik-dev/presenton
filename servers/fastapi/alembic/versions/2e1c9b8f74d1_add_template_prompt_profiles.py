"""add template prompt profiles

Revision ID: 2e1c9b8f74d1
Revises: 95b5127e93cd
Create Date: 2026-06-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "2e1c9b8f74d1"
down_revision: Union[str, None] = "95b5127e93cd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    return table_name in sa.inspect(op.get_bind()).get_table_names()


def upgrade() -> None:
    if _has_table("template_prompt_profiles"):
        return

    op.create_table(
        "template_prompt_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("template_slug", sa.String(), nullable=False),
        sa.Column("template_id", sa.Uuid(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("template_prompt", sa.String(), nullable=True),
        sa.Column("layout_prompts", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by_id", sa.Uuid(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_template_prompt_profiles_template_slug"),
        "template_prompt_profiles",
        ["template_slug"],
        unique=True,
    )
    op.create_index(
        op.f("ix_template_prompt_profiles_template_id"),
        "template_prompt_profiles",
        ["template_id"],
        unique=False,
    )


def downgrade() -> None:
    if not _has_table("template_prompt_profiles"):
        return

    op.drop_index(
        op.f("ix_template_prompt_profiles_template_id"),
        table_name="template_prompt_profiles",
    )
    op.drop_index(
        op.f("ix_template_prompt_profiles_template_slug"),
        table_name="template_prompt_profiles",
    )
    op.drop_table("template_prompt_profiles")
