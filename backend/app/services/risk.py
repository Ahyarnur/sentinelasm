"""Risk scoring heuristic for assets and findings."""
from app.models.finding import Finding

SEVERITY_WEIGHT: dict[str, int] = {
    "critical": 40,
    "high": 25,
    "medium": 12,
    "low": 5,
    "info": 1,
}

SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"]


def score_findings(findings: list[Finding]) -> int:
    """Aggregate a 0-100 risk score from a set of findings.

    Uses a saturating sum so that many low findings cannot exceed a single
    critical one, then caps at 100.
    """
    if not findings:
        return 0
    total = 0.0
    for finding in findings:
        weight = SEVERITY_WEIGHT.get(finding.severity, 0)
        # Confidence factor: lower confidence contributes less.
        factor = {"high": 1.0, "medium": 0.8, "low": 0.5}.get(finding.confidence, 0.8)
        total += weight * factor
    return min(100, round(total))


def risk_bucket(score: int) -> str:
    if score >= 70:
        return "critical"
    if score >= 45:
        return "high"
    if score >= 20:
        return "medium"
    if score > 0:
        return "low"
    return "info"


def worst_severity(findings: list[Finding]) -> str:
    if not findings:
        return "info"
    present = {f.severity for f in findings}
    for severity in SEVERITY_ORDER:
        if severity in present:
            return severity
    return "info"


def finding_risk_score(finding: Finding) -> int:
    """Per-finding priority score (0-100) combining severity, CVSS and EPSS."""
    score = float(SEVERITY_WEIGHT.get(finding.severity, 1))
    cvss = getattr(finding, "cvss_score", None)
    epss = getattr(finding, "epss_score", None)
    if cvss:
        score = max(score, cvss * 10)
    if epss:
        score += epss * 20
    return min(100, round(score))
