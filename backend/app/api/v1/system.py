"""System / capability endpoints."""
import json

import redis
from fastapi import APIRouter

from app.core.config import settings
from app.scanners.registry import ALL_SCANNERS, SCANNER_INVENTORY_KEY

router = APIRouter(prefix="/system", tags=["system"])


def _worker_inventory() -> dict | None:
    """Baca inventaris scanner yang dipublikasikan container ``worker``.

    Tool hanya dipasang di container worker, jadi pengecekan lokal di sini akan
    selalu melaporkan "tidak tersedia". Kembalikan ``None`` bila Redis tidak
    bisa dihubungi atau worker belum pernah melapor, agar pemanggil dapat jatuh
    ke pengecekan lokal sebagai cadangan.
    """
    try:
        client = redis.Redis.from_url(
            settings.redis_url, socket_connect_timeout=1, socket_timeout=1
        )
        raw = client.get(SCANNER_INVENTORY_KEY)
    except Exception:  # noqa: BLE001 - Redis opsional untuk endpoint ini
        return None

    if not raw:
        return None
    try:
        payload = json.loads(raw)
    except (TypeError, ValueError):
        return None
    if not isinstance(payload, dict) or "scanners" not in payload:
        return None
    return payload


@router.get("/scanners")
def list_scanners() -> dict:
    """Report which external scanners are currently available."""
    cached = _worker_inventory()
    if cached is not None:
        return {"source": "worker", **cached}
    return {
        "source": "api",
        "scanners": [
            {"name": s.name, "binary": s.binary, "available": s.available()}
            for s in ALL_SCANNERS
        ],
    }
