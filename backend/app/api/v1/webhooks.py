"""Notification webhook endpoints."""
import httpx
from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/test")
def test_webhook(_: object = Depends(get_current_user)) -> dict:
    if not settings.slack_webhook_url:
        return {"sent": False, "reason": "SLACK_WEBHOOK_URL not configured"}
    try:
        response = httpx.post(
            settings.slack_webhook_url,
            json={"text": "✅ SentinelASM: uji notifikasi berhasil."},
            timeout=10,
        )
        return {"sent": response.status_code < 400, "status_code": response.status_code}
    except httpx.HTTPError as exc:
        return {"sent": False, "reason": str(exc)}
