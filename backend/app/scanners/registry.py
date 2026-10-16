"""Scanner registry — single place to register available adapters."""
from app.scanners.base import ScannerAdapter
from app.scanners.cloud_enum import CloudEnumScanner
from app.scanners.dalfox import DalfoxScanner
from app.scanners.gau import GauScanner
from app.scanners.httpx import HttpxScanner
from app.scanners.katana import KatanaScanner
from app.scanners.naabu import NaabuScanner
from app.scanners.nuclei import NucleiScanner
from app.scanners.sqlmap import SqlmapScanner
from app.scanners.subfinder import SubfinderScanner
from app.scanners.testssl import TestsslScanner
from app.scanners.zap import ZapScanner

DISCOVERY_SCANNERS: list[ScannerAdapter] = [SubfinderScanner()]
PROBE_SCANNERS: list[ScannerAdapter] = [NaabuScanner(), HttpxScanner()]
CRAWL_SCANNERS: list[ScannerAdapter] = [KatanaScanner(), GauScanner()]
VULN_SCANNERS: list[ScannerAdapter] = [NucleiScanner(), TestsslScanner()]

# Aggressive scanners — only executed when ENABLE_ACTIVE_SCANNING=true.
ACTIVE_SCANNERS: list[ScannerAdapter] = [
    DalfoxScanner(),
    SqlmapScanner(),
    CloudEnumScanner(),
    ZapScanner(),
]

ALL_SCANNERS = (
    DISCOVERY_SCANNERS
    + PROBE_SCANNERS
    + CRAWL_SCANNERS
    + VULN_SCANNERS
    + ACTIVE_SCANNERS
)


def get_adapter(name: str) -> ScannerAdapter | None:
    for scanner in ALL_SCANNERS:
        if scanner.name == name:
            return scanner
    return None
