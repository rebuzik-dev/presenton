"""add_template_font_to_presentations

Revision ID: c3f8a12a4d9e
Revises: 9c1a3b7dbe12
Create Date: 2026-02-12 18:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3f8a12a4d9e"
down_revision: Union[str, Sequence[str], None] = "9c1a3b7dbe12"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("presentations", schema=None) as batch_op:
        batch_op.add_column(sa.Column("template_font", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("presentations", schema=None) as batch_op:
        batch_op.drop_column("template_font")

