from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.video import Video, VideoSource, VideoStatus
from app.models.user import User
from app.schemas.video import (
    VideoImportRequest,
    VideoResponse,
    VideoListResponse,
)
from app.core.security import get_current_user
from app.tasks.video_tasks import download_video
import uuid

router = APIRouter()


@router.post("/import", status_code=202)
async def import_video(
    data: VideoImportRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import video from YouTube/TikTok link."""
    if user.credits_remaining <= 0:
        raise HTTPException(status_code=402, detail="No credits remaining")

    video = Video(
        user_id=user.id,
        source=VideoSource(data.source),
        source_url=str(data.url),
        original_filename="下載中...",
        status=VideoStatus.downloading,
    )
    db.add(video)
    await db.flush()
    await db.refresh(video)

    user.credits_remaining -= 1

    download_video.delay(str(video.id), str(data.url), data.source, data.quality)

    return VideoResponse.model_validate(video)


@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload video file directly."""
    if user.credits_remaining <= 0:
        raise HTTPException(status_code=402, detail="No credits remaining")

    import aiofiles
    import os
    from pathlib import Path

    upload_dir = Path("/tmp/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / f"{uuid.uuid4()}_{file.filename}"

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    video = Video(
        user_id=user.id,
        source=VideoSource.upload,
        original_filename=file.filename or "上傳影片",
        file_size_bytes=len(content),
        status=VideoStatus.ready,
    )
    db.add(video)
    await db.flush()
    await db.refresh(video)

    user.credits_remaining -= 1

    return VideoResponse.model_validate(video)


@router.get("")
async def list_videos(
    page: int = 1,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's videos."""
    offset = (page - 1) * limit
    q = (
        select(Video)
        .where(Video.user_id == user.id)
        .order_by(Video.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(q)
    videos = result.scalars().all()

    count_q = (
        select(func.count())
        .select_from(Video)
        .where(Video.user_id == user.id)
    )
    count_result = await db.execute(count_q)
    total = count_result.scalar()

    return VideoListResponse(
        items=[VideoResponse.model_validate(v) for v in videos],
        total=total,
    )


@router.get("/{video_id}")
async def get_video(
    video_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Video).where(Video.id == video_id, Video.user_id == user.id)
    result = await db.execute(q)
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return VideoResponse.model_validate(video)


@router.delete("/{video_id}", status_code=204)
async def delete_video(
    video_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Video).where(Video.id == video_id, Video.user_id == user.id)
    result = await db.execute(q)
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    await db.delete(video)
