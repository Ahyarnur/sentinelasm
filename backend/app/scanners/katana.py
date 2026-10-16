"""Katana adapter — web crawling to discover endpoints.

Discovered URLs are surfaced as informational findings, filtered to those that
are most useful for manual testing (query parameters or sensitive keywords).
"""
from app.scanners.base import FindingData, ScannerAdapter

_SENSITIVE = ("admin", "api", "debug", "internal", "backup", ".git", "config", "token")


class KatanaScanner(ScannerAdapter):
    name = "katana"
    binary = "katana"

    def crawl(self, host: str) -> list[FindingData]:
        url = host if host.startswith("http") else f"https://{host}"
        out = self._run(
            [self.binary, "-u", url, "-silent", "-d", "3", "-jc", "-kf", "all"],
            timeout=600,
        )
        findings: list[FindingData] = []
        seen: set[str] = set()
        for line in out.splitlines():
            found = line.strip()
            if not found or found in seen:
                continue
            seen.add(found)
            lowered = found.lower()
            if "?" not in found and not any(k in lowered for k in _SENSITIVE):
                continue
            findings.append(
                FindingData(
                    source=self.name,
                    severity="info",
                    title="Endpoint ditemukan (crawl)",
                    description=found,
                    evidence=found,
                    confidence="medium",
                )
            )
            if len(findings) >= 200:
                break
        return findings
