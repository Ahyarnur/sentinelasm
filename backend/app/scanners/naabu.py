"""Naabu adapter — fast port scanning."""
from app.core.config import settings
from app.scanners.base import ScannerAdapter, ServiceData


class NaabuScanner(ScannerAdapter):
    name = "naabu"
    binary = "naabu"

    def probe(self, host: str) -> list[ServiceData]:
        out = self._run(
            [self.binary, "-host", host, "-top-ports", str(settings.port_scan_top), "-silent"]
        )
        services: list[ServiceData] = []
        for line in out.splitlines():
            line = line.strip()
            if not line:
                continue
            # naabu output: host:port
            host_part, _, port_part = line.rpartition(":")
            if not port_part.isdigit():
                continue
            services.append(ServiceData(host=host_part or host, port=int(port_part)))
        return services
