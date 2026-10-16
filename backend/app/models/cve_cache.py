"""Cache of CVE enrichment data (CVSS / EPSS) to avoid repeated API calls."""
from datetime import datetime

from sqlalchemy import DateTime, Float, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CveCache(Base):
    __tablename__ = "cve_cache"

    cve: Mapped[str] = mapped_column(String(64), primary_key=True)
    cvss_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    epss_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    summary: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
