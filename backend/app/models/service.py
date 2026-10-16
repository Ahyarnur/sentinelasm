"""Detected network service (port + technology + TLS)."""
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import JSONType


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"))
    port: Mapped[int] = mapped_column(Integer)
    protocol: Mapped[str] = mapped_column(String(8), default="tcp")
    name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    version: Mapped[str | None] = mapped_column(String(255), nullable=True)
    technologies: Mapped[list] = mapped_column(JSONType, default=list)
    tls: Mapped[dict] = mapped_column(JSONType, default=dict)

    asset: Mapped["Asset"] = relationship(back_populates="services")
