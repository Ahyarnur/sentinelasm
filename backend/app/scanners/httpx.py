"""httpx adapter — HTTP probing, fingerprinting, and TLS metadata."""
import json

from app.scanners.base import ScannerAdapter, ServiceData


class HttpxScanner(ScannerAdapter):
    name = "httpx"
    binary = "httpx"
    verify_marker = "projectdiscovery"

    def probe(self, host: str) -> list[ServiceData]:
        out = self._run(
            [self.binary, "-u", host, "-json", "-silent", "-tech-detect", "-tls-grab"]
        )
        services: list[ServiceData] = []
        for line in out.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                continue

            port = data.get("port") or (443 if data.get("scheme") == "https" else 80)
            tls = data.get("tls") or {}
            technologies = data.get("tech") or []
            services.append(
                ServiceData(
                    host=data.get("host") or host,
                    port=int(port),
                    protocol="https" if data.get("scheme") == "https" else "http",
                    name=data.get("webserver"),
                    version=data.get("title"),
                    technologies=list(technologies),
                    tls=tls if isinstance(tls, dict) else {},
                )
            )
        return services
