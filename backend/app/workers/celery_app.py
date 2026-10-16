"""Celery application and beat schedule."""
from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "sentinelasm",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_track_started=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    beat_schedule={
        "rescan-all-targets-daily": {
            "task": "app.workers.tasks.schedule_all_targets",
            "schedule": 60 * 60 * 24,
        },
        "reap-stale-scans": {
            "task": "app.workers.tasks.reap_stale_scans",
            "schedule": 60 * 15,
        },
        "report-scanners": {
            "task": "app.workers.tasks.report_scanners",
            "schedule": 60 * 5,
        },
    },
    task_routes={
        "app.workers.tasks.run_full_scan": {"queue": "discovery"},
        "app.workers.tasks.schedule_all_targets": {"queue": "discovery"},
        "app.workers.tasks.reap_stale_scans": {"queue": "discovery"},
        "app.workers.tasks.report_scanners": {"queue": "discovery"},
    },
)

# Make this the process-wide default so ``shared_task`` callers (e.g. the API)
# publish to our Redis broker instead of Celery's default amqp://localhost.
celery_app.set_default()

# Register tasks on import.
from app.workers import tasks  # noqa: E402,F401
