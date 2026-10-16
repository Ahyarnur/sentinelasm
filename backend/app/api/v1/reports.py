"""Report endpoints: inline HTML, artifact generation, and download."""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, HTMLResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Report, Target
from app.schemas.schemas import ReportRead
from app.services.reporting import generate_report, render_html
from app.services.storage import get_storage

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/target/{target_id}", response_class=HTMLResponse)
def inline_report(
    target_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
) -> HTMLResponse:
    target = db.get(Target, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")
    return HTMLResponse(content=render_html(db, target))


@router.post("/target/{target_id}", response_model=ReportRead, status_code=201)
def create_report(
    target_id: int,
    kind: str = Query(default="pdf", pattern="^(pdf|html)$"),
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
) -> Report:
    target = db.get(Target, target_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target not found")
    return generate_report(db, target, kind=kind)


@router.get("", response_model=list[ReportRead])
def list_reports(
    target_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
) -> list[Report]:
    query = db.query(Report)
    if target_id is not None:
        query = query.filter(Report.target_id == target_id)
    return query.order_by(Report.id.desc()).all()


@router.get("/{report_id}/download")
def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
) -> FileResponse:
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    path = get_storage().full_path(report.path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Artifact missing")
    filename = f"sentinelasm_report_{report.target_id}.{report.kind}"
    media_type = "application/pdf" if report.kind == "pdf" else "text/html"
    return FileResponse(path, media_type=media_type, filename=filename)
