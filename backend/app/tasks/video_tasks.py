from app.tasks.celery_app import celery_app
from app.services.video_service import VideoService
from app.services.storage import StorageService
from app.core.database import async_session_factory
from app.models.video import Video, VideoStatus
from sqlalchemy import select
import uuid
import os


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def download_video(self, video_id: str, url: str, source: str, quality: str = "1080p"):
    """Background task: download video, upload to R2, update DB."""
    import asyncio

    async def _run():
        service = VideoService()
        storage = StorageService()

        result = await service.download(url, source, quality)
        remote_key = f"videos/{video_id}/original.{result['ext']}"
        storage_url = await storage.upload_file(result["file_path"], remote_key)

        async with async_session_factory() as session:
            q = select(Video).where(Video.id == uuid.UUID(video_id))
            r = await session.execute(q)
            video = r.scalar_one()
            video.status = VideoStatus.ready
            video.storage_url = storage_url
            video.original_filename = result["title"]
            video.duration_seconds = result["duration"]
            video.thumbnail_url = result["thumbnail"]
            video.file_size_bytes = os.path.getsize(result["file_path"])
            await session.commit()

        os.remove(result["file_path"])
        return {"video_id": video_id, "status": "ready"}

    try:
        return asyncio.run(_run())
    except Exception as exc:
        async def _fail():
            async with async_session_factory() as session:
                q = select(Video).where(Video.id == uuid.UUID(video_id))
                r = await session.execute(q)
                video = r.scalar_one()
                video.status = VideoStatus.failed
                video.error_message = str(exc)
                await session.commit()
        asyncio.run(_fail())
        raise self.retry(exc=exc)
