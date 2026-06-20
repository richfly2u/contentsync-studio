from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.video import Video, VideoStatus
from app.models.transcript import Transcript
from app.models.user import User
from app.schemas.ai import TranscriptResponse, AIJobStatus
from app.core.security import get_current_user
from app.tasks.ai_tasks import process_video_ai
import uuid

router = APIRouter()


@router.post("/transcribe/{video_id}", status_code=202)
async def start_transcription(
    video_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start AI processing pipeline for a video."""
    q = select(Video).where(Video.id == video_id, Video.user_id == user.id)
    result = await db.execute(q)
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if video.status != VideoStatus.ready:
        raise HTTPException(
            status_code=400,
            detail=f"Video status is '{video.status.value}', expected 'ready'",
        )

    task = process_video_ai.delay(str(video.id))
    return {"job_id": task.id, "status": "queued"}


@router.get("/transcript/{video_id}")
async def get_transcript(
    video_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get transcript for a video."""
    q = select(Transcript).join(Video).where(
        Transcript.video_id == video_id,
        Video.user_id == user.id,
    )
    result = await db.execute(q)
    transcript = result.scalar_one_or_none()
    if not transcript:
        raise HTTPException(
            status_code=404,
            detail="Transcript not found or still processing",
        )
    return TranscriptResponse.model_validate(transcript)


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Check AI job status."""
    from app.tasks.celery_app import celery_app

    task = celery_app.AsyncResult(job_id)
    return AIJobStatus(
        job_id=job_id,
        status=task.state,
        result=task.result if task.ready() else None,
    )
