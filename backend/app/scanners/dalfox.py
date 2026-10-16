"""Dalfox adapter — XSS detection (active, opt-in)."""
import json

from app.scanners.base import FindingData, ScannerAdapter


class DalfoxScanner(ScannerAdapter):
    name = "dalfox"
    binary = "dalfox"

    def scan(self, host: str) -> list[FindingData]:
        url = host if host.startswith("http") else f"https://{host}"
        out = self._run(
            [self.binary, "url", url, "--silence", "--format", "json"], timeout=600
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
            findings.append(
                FindingData(
                    source=self.name,
                    severity="high",
                    title="XSS terdeteksi",
                    description=data.get("message_str") or data.get("message") or "",
                    evidence=data.get("poc") or data.get("data") or url,
                    confidence="high",
                )
            )
        return findings
