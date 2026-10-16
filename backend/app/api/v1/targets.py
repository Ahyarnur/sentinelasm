"""Target management endpoints."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Scan, Target
from app.schemas.schemas import ScanRead, TargetCreate, TargetRead
from app.workers.celery_app import celery_app  # noqa: F401  (bind shared_task to our app)
from app.workers.tasks import run_full_scan

router = APIRouter(prefix="/targets", tags=["targets"])


def _normalize_domain(raw: str) -> str:
    """Accept user input like 'https://Example.com:8443/path/' -> 'example.com'."""
    value = raw.strip().lower()
    value = value.split("://")[-1]  # strip scheme
    value = value.split("/")[0]    # strip path
    value = value.split("@")[-1]   # strip userinfo
    value = value.split(":")[0]    # strip port
    return value.rstrip(".")


@router.get("", response_model=list[TargetRead])
def list_targets(
    db: Session = Depends(get_db), _: object = Depends(get_current_user)
) -> list[Target]:
    return db.query(Target).order_by(Target.id).all()


@router.post("", response_model=TargetRead, status_code=status.HTTP_201_CREATED)
def create_target(
    payload: TargetCreate,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
) -> Target:
    domain = _normalize_domain(payload.domain)
    if "." not in domain:
        raise HTTPException(status_code=400, detail="Domain tidak valid")
    if db.query(Target).filter(Target.domain == domain).one_or_none():
        raise HTTPException(status_code=400, detail="Target already exists")
    target = Target(domain=domain, schedule_cron=payload.schedule_cron)
    db.add(target)
    db.commit()
    db.refresh(target)
    return target


@router.delete("/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_target(
    target_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
) -> None:
    target = db.get(Target, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")
    db.delete(target)
    db.commit()


@router.post("/{target_id}/scan", response_model=ScanRead, status_code=status.HTTP_202_ACCEPTED)
def trigger_scan(
    target_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
) -> Scan:
    target = db.get(Target, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")

    scan = Scan(target_id=target_id, kind="manual", status="queued")
    db.add(scan)
    db.commit()
    db.refresh(scan)

    try:
        run_full_scan.delay(target_id, scan.id)
    except Exception as exc:  # noqa: BLE001 - broker bisa tidak tersedia
        # Tanpa ini, kegagalan broker memunculkan 500 tanpa header CORS dan UI
        # hanya menampilkan "Failed to fetch" yang tidak informatif.
        scan.status = "failed"
        scan.finished_at = datetime.now(timezone.utc)
        scan.summary = {"error": f"Antrean tidak dapat dihubungi: {exc}"}
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Antrean scan tidak dapat dihubungi. Coba lagi beberapa saat.",
        ) from exc

    return scan
