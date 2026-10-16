"""sqlmap adapter — SQL injection detection (active, opt-in).

Best-effort: sqlmap has no native JSON output, so we parse known markers from
stdout.
"""
import re

from app.scanners.base import FindingData, ScannerAdapter


class SqlmapScanner(ScannerAdapter):
    name = "sqlmap"
    binary = "sqlmap"

    def scan(self, host: str) -> list[FindingData]:
        url = host if host.startswith("http") else f"https://{host}"
        out = self._run(
            [
                self.binary,
                "-u",
                url,
                "--batch",
                "--smart",
                "--level",
                "1",
                "--risk",
                "1",
            ],
            timeout=900,
        )
        if "is vulnerable" not in out and "Parameter:" not in out:
            return []

        params = re.findall(r"Parameter:\s*(.+)", out)
        evidence = "; ".join(p.strip() for p in params[:5]) or url
        return [
            FindingData(
                source=self.name,
                severity="critical",
                title="SQL Injection terdeteksi",
                description="sqlmap menemukan parameter yang rentan terhadap SQL injection",
                evidence=evidence,
                confidence="high",
            )
        ]
