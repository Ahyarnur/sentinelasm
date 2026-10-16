"""CVE enrichment: CVSS (NVD) and EPSS scores, cached in the database.

All network calls are best-effort: if the APIs are unreachable the pipeline
continues without enrichment.
"""
from __future__ import annotations

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import CveCache, Finding


def _fetch_nvd(client: httpx.Client, cve: str) -> tuple[float | None, str]:
    headers = {"apiKey": settings.nvd_api_key} if settings.nvd_api_key else {}
    resp = client.get(
        settings.nvd_api_url,
        params={"cveId": cve},
        headers=headers,
        timeout=15,
    )
    resp.raise_for_status()
    payload = resp.json()
    items = payload.get("vulnerabilities") or []
    if not items:
        return None, ""

    cve_data = items[0].get("cve") or {}
    summary = ""
    for desc in cve_data.get("descriptions") or []:
        if desc.get("lang") == "en":
            summary = desc.get("value", "")
            break

    score: float | None = None
    metrics = cve_data.get("metrics") or {}
    for key in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
        entries = metrics.get(key) or []
        if entries:
            data = entries[0].get("cvssData") or {}
            score = data.get("baseScore")
            break
    return (float(score) if score is not None else None), summary


def _fetch_epss(client: httpx.Client, cve: str) -> float | None:
    resp = client.get(settings.epss_api_url, params={"cve": cve}, timeout=15)
    resp.raise_for_status()
    data = resp.json().get("data") or []
    if not data:
        return None
    try:
        return float(data[0].get("epss"))
    except (TypeError, ValueError):
        return None


def enrich_cve(db: Session, cve: str) -> tuple[float | None, float | None, str]:
    """Return (cvss, epss, summary), using the DB cache when available."""
    cached = db.get(CveCache, cve)
    if cached is not None:
        return cached.cvss_score, cached.epss_score, cached.summary

    cvss: float | None = None
    epss: float | None = None
    summary = ""
    try:
        with httpx.Client() as client:
            cvss, summary = _fetch_nvd(client, cve)
            epss = _fetch_epss(client, cve)
    except httpx.HTTPError:
        pass  # offline / rate limited — degrade gracefully

    db.merge(
        CveCache(cve=cve, cvss_score=cvss, epss_score=epss, summary=summary)
    )
    db.commit()
    return cvss, epss, summary


def enrich_findings(db: Session, findings: list[Finding]) -> int:
    """Attach CVSS/EPSS (when a CVE is present) and compute a risk score."""
    from app.services.risk import finding_risk_score  # local import to avoid cycle

    if not settings.enable_enrichment:
        return 0

    enriched = 0
    for finding in findings:
        if not finding.cve:
            finding.risk_score = finding_risk_score(finding)
            continue
        cvss, epss, _ = enrich_cve(db, finding.cve)
        finding.cvss_score = cvss
        finding.epss_score = epss
        finding.risk_score = finding_risk_score(finding)
        enriched += 1
    db.commit()
    return enriched
