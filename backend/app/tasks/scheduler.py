"""Celery Beat scheduler — checks for due scheduled publishes."""
from celery import shared_task
from app.core.celery_app import celery_app
from app.core.database import async_session_factory
from app.models.published_content import PublishedContent, PublishStatus
from app.models.video import Video
from app.services.platform_service import PlatformService
from datetime import datetime, timezone
from sqlalchemy import select, func


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def execute_scheduled_publish(self, publish_id: str):
    """Execute a single scheduled publish when its time arrives."""
    import asyncio

    async def _run():
        async with async_session_factory() as db:
            q = select(PublishedContent).where(PublishedContent.id == publish_id)
            result = await db.execute(q)
            pub = result.scalar_one_or_none()
            if not pub or pub.status != PublishStatus.scheduled:
                return {"status": "skipped", "reason": "not found or not scheduled"}

            # Get the video
            vq = select(Video).where(Video.id == pub.video_id)
            vr = await db.execute(vq)
            video = vr.scalar_one_or_none()
            if not video:
                pub.status = PublishStatus.failed
                await db.commit()
                return {"status": "failed", "reason": "video not found"}

            # Execute publish
            pub.status = PublishStatus.publishing
            await db.commit()

            service = PlatformService()
            try:
                if pub.platform == "youtube":
                    result = await service.publish_to_youtube(
                        access_token="placeholder",
                        video_path=video.storage_url or "",
                        title=video.original_filename,
                        description=pub.caption_text or "",
                    )
                elif pub.platform == "tiktok":
                    result = await service.publish_to_tiktok(
                        access_token="placeholder",
                        video_path=video.storage_url or "",
                        caption=pub.caption_text or "",
                    )
                elif pub.platform == "facebook":
                    result = await service.publish_to_facebook(
                        access_token="placeholder",
                        video_path=video.storage_url or "",
                        description=pub.caption_text or "",
                    )
                elif pub.platform == "xiaohongshu":
                    result = await service.publish_to_xiaohongshu(
                        cookies="placeholder",
                        video_path=video.storage_url or "",
                        title=video.original_filename,
                        description=pub.caption_text or "",
                    )
                else:
                    raise ValueError(f"Unsupported platform: {pub.platform}")

                pub.status = PublishStatus.published
                pub.platform_post_id = result.get("platform_post_id", "")
                pub.platform_url = result.get("platform_url", "")
                pub.published_at = func.now()
                await db.commit()
                return {"status": "published", "platform": pub.platform}

            except Exception as e:
                pub.status = PublishStatus.failed
                await db.commit()
                # Retry on transient errors
                if self.request.retries < self.max_retries:
                    raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))
                return {"status": "failed", "error": str(e)}

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_run())
    finally:
        loop.close()


@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    """Check for due schedules every 5 minutes."""
    sender.add_periodic_task(300.0, check_due_schedules.s(), name="check-due-schedules")


@shared_task
def check_due_schedules():
    """Scan for scheduled items whose time has come and trigger execution."""
    import asyncio

    async def _scan():
        async with async_session_factory() as db:
            now = datetime.now(timezone.utc)
            q = select(PublishedContent).where(
                PublishedContent.status == PublishStatus.scheduled,
                PublishedContent.scheduled_at <= now,
            )
            result = await db.execute(q)
            due = result.scalars().all()

        for pub in due:
            execute_scheduled_publish.delay(str(pub.id))

        return {"checked": True, "due_count": len(due)}

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_scan())
    finally:
        loop.close()
