"""cloud_enum adapter — public cloud storage enumeration (active, opt-in)."""
import os
import tempfile

from app.scanners.base import FindingData, ScannerAdapter


class CloudEnumScanner(ScannerAdapter):
    name = "cloud_enum"
    binary = "cloud_enum"

    def scan(self, host: str) -> list[FindingData]:
        domain = host.split("://")[-1].split("/")[0]
        keyword = domain.split(".")[0]
        fd, outfile = tempfile.mkstemp(suffix=".txt", prefix="cloudenum_")
        os.close(fd)
        try:
            self._run([self.binary, "-k", keyword, "-l", outfile], timeout=600)
            with open(outfile, encoding="utf-8", errors="ignore") as fh:
                content = fh.read()
        except OSError:
            return []
        finally:
            if os.path.exists(outfile):
                os.remove(outfile)

        findings: list[FindingData] = []
        for line in content.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            findings.append(
                FindingData(
                    source=self.name,
                    severity="medium",
                    title="Cloud storage publik ditemukan",
                    description=line,
                    evidence=line,
                    confidence="medium",
                )
            )
            if len(findings) >= 100:
                break
        return findings
