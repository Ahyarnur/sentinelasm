"""Finding triage endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Asset, Finding
from app.schemas.schemas import FindingRead, FindingUpdate

router = APIRouter(prefix="/findings", tags=["findings"])


@router.get("", response_model=list[FindingRead])
def list_findings(
    asset_id: int | None = Query(default=None),
    target_id: int | None = Query(default=None),
    severity: str | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
) -> list[Finding]:
    query = db.query(Finding)
    if target_id is not None:
        query = query.join(Asset, Finding.asset_id == Asset.id).filter(
            Asset.target_id == target_id
        )
    if asset_id is not None:
        query = query.filter(Finding.asset_id == asset_id)
    if severity:
        query = query.filter(Finding.severity == severity)
    if status:
        query = query.filter(Finding.status == status)
    return query.order_by(Finding.id.desc()).all()


@router.patch("/{finding_id}", response_model=FindingRead)
def update_finding(
    finding_id: int,
    payload: FindingUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
) -> Finding:
    finding = db.get(Finding, finding_id)
    if finding is None:
        raise HTTPException(status_code=404, detail="Finding not found")
    finding.status = payload.status
    db.commit()
    db.refresh(finding)
    return finding
