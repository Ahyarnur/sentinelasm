"""Portable column types shared across models."""
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB

# JSONB on PostgreSQL, plain JSON elsewhere (e.g. SQLite for tests).
JSONType = JSON().with_variant(JSONB(), "postgresql")
