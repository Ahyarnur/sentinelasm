"""Subfinder adapter — passive subdomain enumeration."""
from app.scanners.base import HostData, ScannerAdapter


class SubfinderScanner(ScannerAdapter):
    name = "subfinder"
    binary = "subfinder"

    def discover(self, domain: str) -> list[HostData]:
        out = self._run([self.binary, "-d", domain, "-silent"])
        hosts: list[HostData] = []
        seen: set[str] = set()
        for line in out.splitlines():
            host = line.strip().lower()
            if host and host not in seen:
                seen.add(host)
                hosts.append(HostData(host=host, source=self.name))
        return hosts
