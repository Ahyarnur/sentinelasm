"""System / capability endpoints."""
from fastapi import APIRouter

from app.scanners.registry import ALL_SCANNERS

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/scanners")
def list_scanners() -> dict:
    """Report which external scanners are currently available."""
    return {
        "scanners": [
            {"name": s.name, "binary": s.binary, "available": s.available()}
            for s in ALL_SCANNERS
        ]
    }
