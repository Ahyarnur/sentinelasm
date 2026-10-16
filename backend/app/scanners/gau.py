"""gau (GetAllUrls) adapter — historical URLs from public archives.

Surfaces previously-seen endpoints which often reveal forgotten parameters and
routes. Returned as informational findings.
"""
from app.scanners.base import FindingData, ScannerAdapter

_SENSITIVE = ("admin", "api", "debug", "internal", "backup", ".git", "config", "token")


class GauScanner(ScannerAdapter):
    name = "gau"
    binary = "gau"

    def crawl(self, host: str) -> list[FindingData]:
        domain = host.split("://")[-1].split("/")[0]
        out = self._run([self.binary, domain, "--threads", "5"], timeout=600)
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
                    title="Endpoint historis ditemukan",
                    description=found,
                    evidence=found,
                    confidence="low",
                )
            )
            if len(findings) >= 200:
                break
        return findings
