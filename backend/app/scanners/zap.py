"""OWASP ZAP baseline adapter (active, opt-in).

Wraps ``zap-baseline.py`` (shipped with ZAP) and parses its JSON report.
"""
import json
import os
import tempfile

from app.scanners.base import FindingData, ScannerAdapter

_RISK_MAP = {
    "HIGH": "high",
    "MEDIUM": "medium",
    "LOW": "low",
    "INFORMATIONAL": "info",
}


class ZapScanner(ScannerAdapter):
    name = "zap"
    binary = "zap-baseline.py"

    def scan(self, host: str) -> list[FindingData]:
        url = host if host.startswith("http") else f"https://{host}"
        fd, jsonfile = tempfile.mkstemp(suffix=".json", prefix="zap_")
        os.close(fd)
        try:
            self._run(
                [self.binary, "-t", url, "-J", jsonfile, "-m", "1"], timeout=900
            )
            with open(jsonfile, encoding="utf-8") as fh:
                data = json.load(fh)
        except (OSError, json.JSONDecodeError):
            return []
        finally:
            if os.path.exists(jsonfile):
                os.remove(jsonfile)

        findings: list[FindingData] = []
        for site in data.get("site", []):
            for alert in site.get("alerts", []):
                risk = (alert.get("riskdesc") or "").split(" ")[0].upper()
                instances = alert.get("instances") or [{}]
                findings.append(
                    FindingData(
                        source=self.name,
                        severity=_RISK_MAP.get(risk, "info"),
                        title=alert.get("alert") or "ZAP alert",
                        description=alert.get("desc") or "",
                        evidence=instances[0].get("uri") or url,
                        confidence="high",
                    )
                )
        return findings
