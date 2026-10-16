"""Dashboard aggregation endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Asset, Finding, Target
from app.schemas.schemas import DashboardSummary

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/summary", response_model=DashboardSummary)
def summary(
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
) -> DashboardSummary:
    counts = dict(
        db.query(Finding.severity, func.count(Finding.id))
        .group_by(Finding.severity)
        .all()
    )
    return DashboardSummary(
        targets=db.query(Target).count(),
        assets=db.query(Asset).count(),
        findings=db.query(Finding).count(),
        severity_counts=counts,
    )
