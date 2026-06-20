import os
import uuid
import time
from sqlalchemy import select
from app.tasks.celery_app import celery_app
from app.services.ai_service import AIService
from app.core.database import async_session_factory
from app.models.video import Video, VideoStatus
from app.models.transcript import Transcript, TranscriptLanguage


@celery_app.task(bind=True, max_retries=2, default_retry_delay=120)
def process_video_ai(self, video_id: str):
    """Full AI pipeline: extract audio -> transcribe -> clean -> optimize -> summarize."""
    import asyncio

    async def _run():
        ai = AIService()
        video_uuid = uuid.UUID(video_id)

        async with async_session_factory() as session:
            q = select(Video).where(Video.id == video_uuid)
            r = await session.execute(q)
            video = r.scalar_one_or_none()
            if not video:
                raise ValueError(f"Video {video_id} not found")
            video.status = VideoStatus.processing
            await session.commit()

        local_path = video.storage_url
        if not local_path or not os.path.exists(local_path):
            raise FileNotFoundError(f"Video file not found: {local_path}")

        # Step 1: Extract audio
        audio_path = await ai.extract_audio(local_path)

        # Step 2: Transcribe
        start = time.time()
        result = await ai.transcribe(audio_path)
        elapsed = int((time.time() - start) * 1000)

        lang = "zh" if result["language"] and result["language"].startswith("zh") else "en"

        if os.path.exists(audio_path):
            os.remove(audio_path)

        # Step 3: Clean filler words
        cleaned = await ai.clean_transcript(result["text"], language=lang)

        # Step 4: Optimize
        optimized = await ai.optimize_text(result["text"], language=lang)

        # Step 5: Summarize
        summary = await ai.generate_summary(optimized, language=lang)

        # Save to DB
        async with async_session_factory() as session:
            tq = select(Transcript).where(Transcript.video_id == video_uuid)
            tr = await session.execute(tq)
            existing = tr.scalar_one_or_none()

            if existing:
                existing.raw_text = result["text"]
                existing.cleaned_text = cleaned
                existing.optimized_text = optimized
                existing.summary = summary
                existing.language = TranscriptLanguage(lang)
                existing.word_count = len(optimized)
                existing.processing_time_ms = elapsed
                existing.ai_model = "whisper-1+gpt-4o"
            else:
                transcript = Transcript(
                    video_id=video_uuid,
                    raw_text=result["text"],
                    cleaned_text=cleaned,
                    optimized_text=optimized,
                    summary=summary,
                    language=TranscriptLanguage(lang),
                    word_count=len(optimized),
                    processing_time_ms=elapsed,
                    ai_model="whisper-1+gpt-4o",
                )
                session.add(transcript)

            vq = select(Video).where(Video.id == video_uuid)
            vr = await session.execute(vq)
            v = vr.scalar_one()
            v.language = lang
            v.status = VideoStatus.ready
            await session.commit()

        return {"video_id": video_id, "status": "completed", "language": lang}

    try:
        return asyncio.run(_run())
    except Exception as exc:
        async def _fail():
            async with async_session_factory() as session:
                q = select(Video).where(Video.id == uuid.UUID(video_id))
                r = await session.execute(q)
                v = r.scalar_one()
                v.status = VideoStatus.failed
                v.error_message = str(exc)
                await session.commit()
        asyncio.run(_fail())
        raise self.retry(exc=exc)
