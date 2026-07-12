"""Create account profile and consent aggregates.

Revision ID: 20260710_0001
Revises:
Create Date: 2026-07-10 00:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260710_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="active", nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("email_verified", sa.Boolean(), nullable=False),
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
            "status IN ('active', 'restricted', 'deletion_pending')",
            name="ck_users_status",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "identity_links",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("issuer", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("issuer", "subject", name="uq_identity_links_issuer_subject"),
    )
    op.create_index("ix_identity_links_user_id", "identity_links", ["user_id"])
    op.create_table(
        "user_profiles",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("display_name", sa.String(length=80), nullable=False),
        sa.Column("locale", sa.String(length=8), server_default="zh-CN", nullable=False),
        sa.Column("timezone", sa.String(length=64), server_default="Asia/Shanghai", nullable=False),
        sa.Column("school", sa.String(length=120), nullable=True),
        sa.Column("major", sa.String(length=120), nullable=True),
        sa.Column("graduation_year", sa.Integer(), nullable=True),
        sa.Column("career_goal", sa.String(length=200), nullable=True),
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
        sa.CheckConstraint("locale IN ('zh-CN', 'en')", name="ck_user_profiles_locale"),
        sa.CheckConstraint(
            "graduation_year IS NULL OR graduation_year BETWEEN 2000 AND 2200",
            name="ck_user_profiles_graduation_year",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )
    op.create_table(
        "consents",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("purpose", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("policy_version", sa.String(length=40), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint("status IN ('granted', 'revoked')", name="ck_consents_status"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "purpose"),
    )
    op.create_index(
        "ix_consents_user_id_purpose",
        "consents",
        ["user_id", "purpose"],
    )
    op.create_table(
        "consent_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("purpose", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("policy_version", sa.String(length=40), nullable=False),
        sa.Column("source_application", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=64), nullable=False),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('granted', 'revoked')",
            name="ck_consent_events_status",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "idempotency_key",
            name="uq_consent_events_idempotency",
        ),
    )
    op.create_index(
        "ix_consent_events_user_purpose_time",
        "consent_events",
        ["user_id", "purpose", "occurred_at"],
    )
    op.create_table(
        "audit_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=False),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("target_type", sa.String(length=64), nullable=False),
        sa.Column("target_reference", sa.String(length=128), nullable=False),
        sa.Column("changed_fields", sa.JSON(), nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_audit_events_actor_time",
        "audit_events",
        ["actor_user_id", "occurred_at"],
    )
    op.create_index("ix_audit_events_request_id", "audit_events", ["request_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_events_request_id", table_name="audit_events")
    op.drop_index("ix_audit_events_actor_time", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_index("ix_consent_events_user_purpose_time", table_name="consent_events")
    op.drop_table("consent_events")
    op.drop_index("ix_consents_user_id_purpose", table_name="consents")
    op.drop_table("consents")
    op.drop_table("user_profiles")
    op.drop_index("ix_identity_links_user_id", table_name="identity_links")
    op.drop_table("identity_links")
    op.drop_table("users")
