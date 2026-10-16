"""testssl.sh adapter — TLS/SSL configuration assessment.

Runs testssl.sh with JSON output and maps its severities to findings.
"""
from __future__ import annotations

import json
import os
import tempfile

from app.scanners.base import FindingData, ScannerAdapter

_SEVERITY_MAP = {
    "CRITICAL": "critical",
    "HIGH": "high",
    "MEDIUM": "medium",
    "LOW": "low",
    "WARN": "low",
    "INFO": "info",
    "OK": "info",
}

# testssl.sh emits tool-bookkeeping entries that are not real findings.
_NOISE_IDS = {"scanProblem", "scanTime", "engine_problem", "service", "banner", "DNS"}


class TestsslScanner(ScannerAdapter):
    name = "testssl"
    binary = "testssl.sh"

    def scan(self, host: str) -> list[FindingData]:
        domain = host.split("://")[-1].split("/")[0]
        fd, jsonfile = tempfile.mkstemp(suffix=".json", prefix="testssl_")
        os.close(fd)
        try:
            self._run(
                [
                    self.binary,
                    "--quiet",
                    "--color",
                    "0",
                    "--jsonfile",
                    jsonfile,
                    domain,
                ],
                timeout=600,
            )
            with open(jsonfile, encoding="utf-8") as fh:
                data = json.load(fh)
        except (OSError, json.JSONDecodeError):
            return []
        finally:
            if os.path.exists(jsonfile):
                os.remove(jsonfile)

        findings: list[FindingData] = []
        # testssl.sh --jsonfile emits a top-level JSON array (a list of checks);
        # tolerate older/alternate shapes that wrap them in {"scanResult": [...]}.
        entries = data if isinstance(data, list) else data.get("scanResult", [])
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            entry_id = entry.get("id") or ""
            if entry_id in _NOISE_IDS:
                continue
            raw_severity = (entry.get("severity") or "").upper()
            if raw_severity in ("", "OK", "INFO"):
                continue
            findings.append(
                FindingData(
                    source=self.name,
                    severity=_SEVERITY_MAP.get(raw_severity, "info"),
                    title=entry.get("id") or "TLS finding",
                    description=entry.get("finding") or "",
                    cve=entry.get("cve") or None,
                    evidence=entry.get("finding") or "",
                    confidence="high",
                )
            )
        return findings
