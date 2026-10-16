"""Scan history endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Scan
from app.schemas.schemas import ScanRead

router = APIRouter(tags=["scans"])


@router.get("/targets/{target_id}/scans", response_model=list[ScanRead])
def list_scans(
    target_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
) -> list[Scan]:
    return (
        db.query(Scan)
        .filter(Scan.target_id == target_id)
        .order_by(Scan.id.desc())
        .all()
    )


@router.get("/scans", response_model=list[ScanRead])
def list_all_scans(
    limit: int = 100,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
) -> list[Scan]:
    """Riwayat scan seluruh target, terbaru lebih dulu."""
    bounded = max(1, min(limit, 500))
    return db.query(Scan).order_by(Scan.id.desc()).limit(bounded).all()


@router.get("/scans/{scan_id}", response_model=ScanRead)
def get_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
) -> Scan:
    scan = db.get(Scan, scan_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan
