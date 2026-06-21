from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "contentsync",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.video_tasks", "app.tasks.ai_tasks", "app.tasks.scheduler"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
