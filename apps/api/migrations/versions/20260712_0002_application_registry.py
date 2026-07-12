"""Create application registry and per-user application state.

Revision ID: 20260712_0002
Revises: 20260710_0001
Create Date: 2026-07-12 00:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260712_0002"
down_revision: str | None = "20260710_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "application_registrations",
        sa.Column("app_id", sa.String(length=32), nullable=False),
        sa.Column("display_name", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("public_base_url", sa.String(length=255), nullable=False),
        sa.Column("manifest_schema_version", sa.String(length=20), nullable=False),
        sa.Column("manifest_checksum", sa.String(length=64), nullable=False),
        sa.Column("manifest_payload", sa.JSON(), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('planned', 'staging', 'available', 'maintenance', 'disabled')",
            name="ck_application_registrations_status",
        ),
        sa.PrimaryKeyConstraint("app_id"),
    )
    op.create_table(
        "user_app_states",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("app_id", sa.String(length=32), nullable=False),
        sa.Column("state", sa.String(length=16), nullable=False),
        sa.Column("first_used_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "state IN ('active', 'archived')",
            name="ck_user_app_states_state",
        ),
        sa.CheckConstraint(
            "last_used_at >= first_used_at",
            name="ck_user_app_states_time_order",
        ),
        sa.ForeignKeyConstraint(
            ["app_id"],
            ["application_registrations.app_id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "app_id"),
    )
    op.create_index("ix_user_app_states_app_id", "user_app_states", ["app_id"])
    op.create_index(
        "ix_user_app_states_user_last_used",
        "user_app_states",
        ["user_id", "last_used_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_user_app_states_user_last_used", table_name="user_app_states")
    op.drop_index("ix_user_app_states_app_id", table_name="user_app_states")
    op.drop_table("user_app_states")
    op.drop_table("application_registrations")
