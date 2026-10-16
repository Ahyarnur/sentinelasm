"""Scanner adapter contract and shared helpers.

Each open-source tool is wrapped as an adapter that returns normalized data
structures so the rest of the system stays tool-agnostic.
"""
from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass, field


class ScannerError(RuntimeError):
    """Raised when a scanner binary fails."""


@dataclass
class HostData:
    """A discovered host (subdomain / IP)."""

    host: str
    ip: str | None = None
    source: str = ""


@dataclass
class ServiceData:
    """A detected network service / technology."""

    host: str
    port: int
    protocol: str = "tcp"
    name: str | None = None
    version: str | None = None
    technologies: list = field(default_factory=list)
    tls: dict = field(default_factory=dict)


@dataclass
class FindingData:
    """A normalized vulnerability / misconfiguration finding."""

    source: str
    severity: str
    title: str
    description: str = ""
    cve: str | None = None
    evidence: str = ""
    confidence: str = "medium"


class ScannerAdapter:
    """Base class for all tool adapters.

    Subclasses override only the phases they support; the pipeline simply
    skips adapters that return nothing.
    """

    name: str = "base"
    binary: str = ""
    # Optional: verify the binary is really the expected tool by matching the
    # output of `version_args` (guards against name collisions, e.g. the Python
    # `httpx` CLI vs ProjectDiscovery httpx).
    verify_marker: str | None = None
    version_args: list[str] = ["-version"]

    # --- capability check ---
    def available(self) -> bool:
        if not self.binary or shutil.which(self.binary) is None:
            return False
        if self.verify_marker is None:
            return True
        try:
            proc = subprocess.run(
                [self.binary, *self.version_args],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
        except (OSError, subprocess.SubprocessError):
            return False
        output = f"{proc.stdout}{proc.stderr}".lower()
        return self.verify_marker.lower() in output

    # --- process helper ---
    def _run(self, args: list[str], timeout: int = 900) -> str:
        try:
            proc = subprocess.run(
                args,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False,
            )
        except FileNotFoundError as exc:  # binary missing
            raise ScannerError(f"{self.name}: binary not found ({self.binary})") from exc
        except subprocess.TimeoutExpired as exc:
            raise ScannerError(f"{self.name}: timed out") from exc
        return proc.stdout

    # --- pipeline phases (override as needed) ---
    def discover(self, domain: str) -> list[HostData]:
        return []

    def probe(self, host: str) -> list[ServiceData]:
        return []

    def crawl(self, host: str) -> list[FindingData]:
        """Discover URLs/endpoints (returned as informational findings)."""
        return []

    def scan(self, host: str) -> list[FindingData]:
        return []
