"""Scan pipeline tasks.

The pipeline runs three phases against a target and persists normalized
results: discovery -> probe -> vulnerability scan. If no external tool is
installed and ``MOCK_SCANNERS`` is enabled, deterministic sample data is
generated so the platform can be demonstrated end-to-end.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from celery import shared_task
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Asset, Finding, Scan, Service, Target
from app.scanners.registry import (
    ACTIVE_SCANNERS,
    CRAWL_SCANNERS,
    DISCOVERY_SCANNERS,
    PROBE_SCANNERS,
    VULN_SCANNERS,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _get_or_create_asset(
    db: Session, target_id: int, host: str, ip: str | None = None
) -> Asset:
    asset = (
        db.query(Asset)
        .filter(Asset.target_id == target_id, Asset.host == host)
        .one_or_none()
    )
    if asset is None:
        asset = Asset(target_id=target_id, host=host, ip=ip)
        db.add(asset)
        db.flush()
    elif ip and not asset.ip:
        asset.ip = ip
    return asset


def _any_available(scanners) -> bool:
    return any(s.available() for s in scanners)


def _finding_key(asset_id: int, source: str, title: str, cve: str | None, evidence: str | None):
    return (asset_id, source, title, cve or "", (evidence or "")[:200])


def _load_finding_keys(db: Session, asset_ids: list[int]) -> set:
    """Existing finding keys so re-scans do not duplicate rows."""
    if not asset_ids:
        return set()
    rows = (
        db.query(
            Finding.asset_id,
            Finding.source,
            Finding.title,
            Finding.cve,
            Finding.evidence,
        )
        .filter(Finding.asset_id.in_(asset_ids))
        .all()
    )
    return {_finding_key(a, s, t, c, e) for a, s, t, c, e in rows}


def _add_finding(db: Session, seen: set, asset_id: int, f) -> bool:
    key = _finding_key(asset_id, f.source, f.title, f.cve, f.evidence)
    if key in seen:
        return False
    seen.add(key)
    db.add(
        Finding(
            asset_id=asset_id,
            source=f.source,
            severity=f.severity,
            title=f.title,
            description=f.description,
            cve=f.cve,
            evidence=f.evidence,
            confidence=f.confidence,
        )
    )
    return True


def _record_error(errors: list[str] | None, source: str, exc: Exception) -> None:
    """Note a scanner failure without aborting the rest of the phase."""
    if errors is not None:
        errors.append(f"{source}: {type(exc).__name__}: {exc}")


# --- phases ---------------------------------------------------------------

def discovery_phase(db: Session, target: Target, errors: list[str] | None = None) -> int:
    count = 0
    if _any_available(DISCOVERY_SCANNERS):
        for scanner in DISCOVERY_SCANNERS:
            if not scanner.available():
                continue
            try:
                hosts = list(scanner.discover(target.domain))
            except Exception as exc:  # noqa: BLE001 - one tool must not kill the scan
                _record_error(errors, scanner.name, exc)
                continue
            for host in hosts:
                _get_or_create_asset(db, target.id, host.host, host.ip)
                count += 1
    elif settings.mock_scanners:
        count += _seed_mock_discovery(db, target)

    # Always ensure the apex domain itself is tracked.
    _get_or_create_asset(db, target.id, target.domain)
    db.commit()
    return count


def probe_phase(db: Session, target: Target, errors: list[str] | None = None) -> int:
    count = 0
    assets = db.query(Asset).filter(Asset.target_id == target.id).all()
    if _any_available(PROBE_SCANNERS):
        for asset in assets:
            for scanner in PROBE_SCANNERS:
                if not scanner.available():
                    continue
                try:
                    services = list(scanner.probe(asset.host))
                except Exception as exc:  # noqa: BLE001
                    _record_error(errors, scanner.name, exc)
                    continue
                for svc in services:
                    db.add(
                        Service(
                            asset_id=asset.id,
                            port=svc.port,
                            protocol=svc.protocol,
                            name=svc.name,
                            version=svc.version,
                            technologies=svc.technologies,
                            tls=svc.tls,
                        )
                    )
                    count += 1
    elif settings.mock_scanners:
        count += _seed_mock_services(db, assets)
    db.commit()
    return count


def crawl_phase(db: Session, target: Target, errors: list[str] | None = None) -> int:
    count = 0
    assets = db.query(Asset).filter(Asset.target_id == target.id).all()
    seen = _load_finding_keys(db, [a.id for a in assets])
    if _any_available(CRAWL_SCANNERS):
        for asset in assets:
            for scanner in CRAWL_SCANNERS:
                if not scanner.available():
                    continue
                try:
                    results = list(scanner.crawl(asset.host))
                except Exception as exc:  # noqa: BLE001
                    _record_error(errors, scanner.name, exc)
                    continue
                for f in results:
                    if _add_finding(db, seen, asset.id, f):
                        count += 1
    db.commit()
    return count


def vuln_phase(db: Session, target: Target, errors: list[str] | None = None) -> int:
    count = 0
    assets = db.query(Asset).filter(Asset.target_id == target.id).all()
    seen = _load_finding_keys(db, [a.id for a in assets])
    if _any_available(VULN_SCANNERS):
        for asset in assets:
            for scanner in VULN_SCANNERS:
                if not scanner.available():
                    continue
                try:
                    results = list(scanner.scan(asset.host))
                except Exception as exc:  # noqa: BLE001
                    _record_error(errors, scanner.name, exc)
                    continue
                for f in results:
                    if _add_finding(db, seen, asset.id, f):
                        count += 1
    elif settings.mock_scanners:
        count += _seed_mock_findings(db, assets)
    db.commit()
    return count


def active_phase(db: Session, target: Target, errors: list[str] | None = None) -> int:
    """Run aggressive scanners (opt-in via ENABLE_ACTIVE_SCANNING)."""
    if not settings.enable_active_scanning:
        return 0
    count = 0
    assets = db.query(Asset).filter(Asset.target_id == target.id).all()
    seen = _load_finding_keys(db, [a.id for a in assets])
    for asset in assets:
        for scanner in ACTIVE_SCANNERS:
            if not scanner.available():
                continue
            try:
                results = list(scanner.scan(asset.host))
            except Exception as exc:  # noqa: BLE001
                _record_error(errors, scanner.name, exc)
                continue
            for f in results:
                if _add_finding(db, seen, asset.id, f):
                    count += 1
    db.commit()
    return count


def enrich_phase(db: Session, target: Target) -> int:
    """Attach CVSS/EPSS and compute risk scores for the target's findings."""
    from app.services.enrichment import enrich_findings  # local import

    asset_ids = [
        a.id for a in db.query(Asset).filter(Asset.target_id == target.id).all()
    ]
    if not asset_ids:
        return 0
    findings = db.query(Finding).filter(Finding.asset_id.in_(asset_ids)).all()
    if not findings:
        return 0
    return enrich_findings(db, findings)


# --- orchestrator ---------------------------------------------------------

@shared_task(name="app.workers.tasks.run_full_scan")
def run_full_scan(target_id: int, scan_id: int | None = None) -> dict:
    db = SessionLocal()
    try:
        target = db.get(Target, target_id)
        if target is None:
            return {"error": "target not found", "target_id": target_id}

        if scan_id is not None:
            scan = db.get(Scan, scan_id)
        else:
            scan = None
        if scan is None:
            scan = Scan(target_id=target_id, kind="full", status="running")
            db.add(scan)
        scan.status = "running"
        scan.started_at = scan.started_at or _now()
        db.commit()
        db.refresh(scan)

        summary = {
            "assets": 0,
            "services": 0,
            "endpoints": 0,
            "findings": 0,
            "active": 0,
            "enriched": 0,
        }
        errors: list[str] = []
        try:
            summary["assets"] = discovery_phase(db, target, errors)
            summary["services"] = probe_phase(db, target, errors)
            summary["endpoints"] = crawl_phase(db, target, errors)
            summary["findings"] = vuln_phase(db, target, errors)
            summary["active"] = active_phase(db, target, errors)
            summary["enriched"] = enrich_phase(db, target)
            asset_ids = [
                a.id for a in db.query(Asset).filter(Asset.target_id == target.id).all()
            ]
            summary["findings_total"] = (
                db.query(Finding).filter(Finding.asset_id.in_(asset_ids)).count()
                if asset_ids
                else 0
            )
            scan.status = "completed"
        except Exception as exc:  # noqa: BLE001 - record failure on the scan
            scan.status = "failed"
            summary["error"] = str(exc)
        if errors:
            summary["scanner_errors"] = errors
            if scan.status == "completed":
                scan.status = "completed_with_errors"

        scan.summary = summary
        scan.finished_at = _now()
        db.commit()
        return {"scan_id": scan.id, **summary}
    finally:
        db.close()


@shared_task(name="app.workers.tasks.schedule_all_targets")
def schedule_all_targets() -> dict:
    db = SessionLocal()
    try:
        target_ids = [t.id for t in db.query(Target).all()]
    finally:
        db.close()
    for target_id in target_ids:
        run_full_scan.delay(target_id)
    return {"scheduled": target_ids}


@shared_task(name="app.workers.tasks.reap_stale_scans")
def reap_stale_scans(max_age_minutes: int = 120) -> dict:
    """Mark scans abandoned by a worker restart as ``interrupted``.

    Without this, a scan killed mid-run stays ``running`` forever and the UI
    keeps showing it as in-progress.
    """
    db = SessionLocal()
    try:
        cutoff = _now() - timedelta(minutes=max_age_minutes)
        stale = (
            db.query(Scan)
            .filter(
                Scan.status.in_(("queued", "running")),
                Scan.created_at < cutoff,
            )
            .all()
        )
        reaped: list[int] = []
        for scan in stale:
            scan.status = "interrupted"
            scan.finished_at = _now()
            scan.summary = {
                **(scan.summary or {}),
                "note": "ditandai interrupted oleh reaper (worker berhenti?)",
            }
            reaped.append(scan.id)
        db.commit()
        return {"reaped": reaped}
    finally:
        db.close()


# --- mock data (demo without external tools) ------------------------------

def _seed_mock_discovery(db: Session, target: Target) -> int:
    hosts = [f"www.{target.domain}", f"api.{target.domain}", f"staging.{target.domain}"]
    for host in hosts:
        _get_or_create_asset(db, target.id, host)
    return len(hosts)


def _seed_mock_services(db: Session, assets: list[Asset]) -> int:
    count = 0
    for asset in assets:
        if asset.host.startswith("staging"):
            db.add(
                Service(
                    asset_id=asset.id,
                    port=8080,
                    protocol="http",
                    name="Jetty",
                    version="9.4.0",
                    technologies=["Java", "Jetty"],
                )
            )
        else:
            db.add(
                Service(
                    asset_id=asset.id,
                    port=443,
                    protocol="https",
                    name="nginx",
                    version="1.24.0",
                    technologies=["Nginx", "React"],
                    tls={"issuer": "Let's Encrypt", "expires_in_days": 12},
                )
            )
        count += 1
    return count


def _seed_mock_findings(db: Session, assets: list[Asset]) -> int:
    templates = [
        ("critical", "Exposed .git directory", ".git/ config terpapar publik", "CVE-2024-0001", "high"),
        ("high", "Missing HSTS header", "Header Strict-Transport-Security tidak ada", None, "high"),
        ("medium", "Outdated jQuery", "jQuery versi lama dengan XSS diketahui", "CVE-2020-11022", "medium"),
        ("low", "Server version disclosure", "Header Server membocorkan versi", None, "medium"),
    ]
    count = 0
    for asset in assets:
        for severity, title, desc, cve, confidence in templates:
            db.add(
                Finding(
                    asset_id=asset.id,
                    source="mock",
                    severity=severity,
                    title=title,
                    description=desc,
                    cve=cve,
                    evidence=f"https://{asset.host}",
                    confidence=confidence,
                )
            )
            count += 1
    return count
