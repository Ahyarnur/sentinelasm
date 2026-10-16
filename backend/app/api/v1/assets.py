"""Asset listing and detail endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Asset
from app.schemas.schemas import AssetDetail, AssetRead

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("", response_model=list[AssetRead])
def list_assets(
    target_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
) -> list[Asset]:
    query = db.query(Asset)
    if target_id is not None:
        query = query.filter(Asset.target_id == target_id)
    if search:
        query = query.filter(Asset.host.ilike(f"%{search}%"))
    return query.order_by(Asset.host).all()


@router.get("/{asset_id}", response_model=AssetDetail)
def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
) -> Asset:
    asset = db.get(Asset, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset
