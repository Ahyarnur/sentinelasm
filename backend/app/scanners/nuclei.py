"""Nuclei adapter — template-based vulnerability and misconfiguration scanning."""
import json

from app.core.config import settings
from app.scanners.base import FindingData, ScannerAdapter


class NucleiScanner(ScannerAdapter):
    name = "nuclei"
    binary = "nuclei"

    def scan(self, host: str) -> list[FindingData]:
        out = self._run(
            [
                self.binary,
                "-u",
                host,
                "-jsonl",
                "-silent",
                "-severity",
                settings.nuclei_severity,
                "-no-interactsh",
            ]
        )
        findings: list[FindingData] = []
        for line in out.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(data, dict):
                continue
            findings.append(self._parse(data))
        return findings

    def _parse(self, data: dict) -> FindingData:
        info = data.get("info") or {}
        classification = info.get("classification") or {}
        cve_ids = classification.get("cve-id") or []
        if isinstance(cve_ids, str):
            cve_ids = [cve_ids]

        return FindingData(
            source=self.name,
            severity=(info.get("severity") or "info").lower(),
            title=info.get("name")
            or data.get("template-id")
            or "nuclei finding",
            description=info.get("description") or "",
            cve=cve_ids[0] if cve_ids else None,
            evidence=data.get("matched-at") or data.get("host") or "",
            confidence="high",
        )
