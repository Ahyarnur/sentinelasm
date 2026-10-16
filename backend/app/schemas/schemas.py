"""Pydantic schemas for API I/O."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Severity = Literal["critical", "high", "medium", "low", "info"]


# --- Auth ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    role: str


# --- Target ---
class TargetCreate(BaseModel):
    domain: str = Field(min_length=3, max_length=255)
    schedule_cron: str | None = None


class TargetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    domain: str
    scope_verified: bool
    schedule_cron: str | None
    created_at: datetime


# --- Service ---
class ServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    port: int
    protocol: str
    name: str | None
    version: str | None
    technologies: list
    tls: dict


# --- Asset ---
class AssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    target_id: int
    host: str
    ip: str | None
    created_at: datetime


class AssetDetail(AssetRead):
    services: list[ServiceRead] = []


# --- Finding ---
class FindingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    asset_id: int
    source: str
    severity: Severity
    title: str
    description: str
    cve: str | None
    evidence: str
    confidence: str
    status: str
    created_at: datetime


class FindingUpdate(BaseModel):
    status: Literal["open", "in_progress", "resolved", "false_positive"]


# --- Scan ---
class ScanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    target_id: int
    kind: str
    status: str
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime | None = None
    summary: dict


# --- Report ---
class ReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    target_id: int
    kind: str
    path: str
    created_at: datetime


# --- Dashboard ---
class DashboardSummary(BaseModel):
    targets: int
    assets: int
    findings: int
    severity_counts: dict[str, int]
