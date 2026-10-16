"""Report rendering and artifact generation."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Asset, Finding, Report, Target
from app.services.risk import risk_bucket, score_findings, worst_severity
from app.services.storage import get_storage

_TEMPLATE = """<!doctype html>
<html lang="id"><head><meta charset="utf-8">
<title>Laporan SentinelASM — {domain}</title>
<style>
 body{{font-family:system-ui,Arial,sans-serif;margin:2rem;color:#111}}
 h1{{margin-bottom:.2rem}} .muted{{color:#666}}
 table{{border-collapse:collapse;width:100%;margin-top:1rem}}
 th,td{{border:1px solid #ddd;padding:.4rem .6rem;text-align:left;font-size:.9rem}}
 th{{background:#f4f4f5}}
 .critical{{color:#b91c1c;font-weight:600}} .high{{color:#c2410c;font-weight:600}}
 .medium{{color:#a16207}} .low{{color:#15803d}} .info{{color:#475569}}
</style></head><body>
<h1>Laporan Keamanan — {domain}</h1>
<p class="muted">Digenerate otomatis oleh SentinelASM</p>
<p>Total aset: <b>{assets}</b> &nbsp;|&nbsp; Total temuan: <b>{findings}</b></p>
<table>
 <tr><th>Aset</th><th>Jumlah Temuan</th><th>Severity Terburuk</th><th>Skor Risiko</th></tr>
 {rows}
</table>
<h2>Detail Temuan</h2>
<table>
 <tr><th>Aset</th><th>Severity</th><th>Judul</th><th>CVE</th><th>CVSS</th><th>EPSS</th><th>Sumber</th></tr>
 {finding_rows}
</table>
</body></html>"""


def render_html(db: Session, target: Target) -> str:
    assets = db.query(Asset).filter(Asset.target_id == target.id).all()

    asset_rows: list[str] = []
    finding_rows: list[str] = []
    total_findings = 0
    for asset in assets:
        findings = db.query(Finding).filter(Finding.asset_id == asset.id).all()
        total_findings += len(findings)
        score = score_findings(findings)
        asset_rows.append(
            f"<tr><td>{asset.host}</td><td>{len(findings)}</td>"
            f"<td class='{worst_severity(findings)}'>{worst_severity(findings)}</td>"
            f"<td>{score} ({risk_bucket(score)})</td></tr>"
        )
        for finding in findings:
            finding_rows.append(
                f"<tr><td>{asset.host}</td>"
                f"<td class='{finding.severity}'>{finding.severity}</td>"
                f"<td>{finding.title}</td><td>{finding.cve or '-'}</td>"
                f"<td>{finding.cvss_score if finding.cvss_score is not None else '-'}</td>"
                f"<td>{finding.epss_score if finding.epss_score is not None else '-'}</td>"
                f"<td>{finding.source}</td></tr>"
            )

    return _TEMPLATE.format(
        domain=target.domain,
        assets=len(assets),
        findings=total_findings,
        rows="\n".join(asset_rows) or "<tr><td colspan='4'>Tidak ada aset</td></tr>",
        finding_rows="\n".join(finding_rows)
        or "<tr><td colspan='7'>Tidak ada temuan</td></tr>",
    )


def _render_pdf(html: str) -> bytes:
    from weasyprint import HTML  # imported lazily; needs system libs

    return HTML(string=html).write_pdf()


def generate_report(db: Session, target: Target, kind: str = "pdf") -> Report:
    html = render_html(db, target)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")

    extension = "html"
    data = html.encode("utf-8")
    if kind == "pdf":
        try:
            data = _render_pdf(html)
            extension = "pdf"
        except Exception:  # noqa: BLE001 - fall back to HTML when PDF unavailable
            extension = "html"

    relative_path = f"target_{target.id}/report_{stamp}.{extension}"
    get_storage().save(relative_path, data)

    report = Report(target_id=target.id, kind=extension, path=relative_path)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
