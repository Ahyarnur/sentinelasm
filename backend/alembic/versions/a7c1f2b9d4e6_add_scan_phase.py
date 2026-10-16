"""add scan phase

Revision ID: a7c1f2b9d4e6
Revises: 6caa3ec953c5
Create Date: 2026-10-16 15:10:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7c1f2b9d4e6'
down_revision: Union[str, None] = '6caa3ec953c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('scans', sa.Column('phase', sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column('scans', 'phase')
