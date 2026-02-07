"""extend_templates_table

Revision ID: 441754d4da0d
Revises: b6ad4524bb04
Create Date: 2026-02-07 17:42:30.986820

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '441754d4da0d'
down_revision: Union[str, Sequence[str], None] = 'b6ad4524bb04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # SQLite doesn't support adding NOT NULL columns without defaults.
    # Since templates table is likely empty, we recreate with batch mode.
    
    with op.batch_alter_table('templates', schema=None) as batch_op:
        batch_op.add_column(sa.Column('slug', sa.String(), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('ordered', sa.Boolean(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('is_default', sa.Boolean(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('is_system', sa.Boolean(), nullable=False, server_default='1'))
        batch_op.add_column(sa.Column('layouts', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
        batch_op.add_column(sa.Column('created_by_id', sa.Uuid(), nullable=True))
        batch_op.create_index('ix_templates_slug', ['slug'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('templates', schema=None) as batch_op:
        batch_op.drop_index('ix_templates_slug')
        batch_op.drop_column('created_by_id')
        batch_op.drop_column('updated_at')
        batch_op.drop_column('layouts')
        batch_op.drop_column('is_system')
        batch_op.drop_column('is_default')
        batch_op.drop_column('ordered')
        batch_op.drop_column('slug')
