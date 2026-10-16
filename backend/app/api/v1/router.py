"""Aggregate all v1 routers."""
from fastapi import APIRouter

from app.api.v1 import assets, auth, dashboard, findings, reports, scans, system, targets, webhooks

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(targets.router)
api_router.include_router(scans.router)
api_router.include_router(assets.router)
api_router.include_router(findings.router)
api_router.include_router(dashboard.router)
api_router.include_router(reports.router)
api_router.include_router(webhooks.router)
api_router.include_router(system.router)
