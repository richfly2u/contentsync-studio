from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.user import User
from app.models.video import Video, VideoStatus
from app.models.published_content import PublishedContent, PublishStatus
from app.schemas.publish import (
    PublishRequest,
    PublishedContentResponse,
    PublishedListResponse,
)
from app.core.security import get_current_user
from app.services.platform_service import PlatformService
import uuid

router = APIRouter()


@router.post("", status_code=202)
async def publish_video(
    data: PublishRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Publish a video to selected platforms."""
    # Verify video belongs to user
    vq = select(Video).where(Video.id == data.video_id, Video.user_id == user.id)
    vr = await db.execute(vq)
    video = vr.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if video.status != VideoStatus.ready:
        raise HTTPException(status_code=400, detail="Video is not ready")

    results = []
    service = PlatformService()

    for platform in data.platforms:
        # Create publish record
        pub = PublishedContent(
            user_id=user.id,
            video_id=data.video_id,
            platform=platform,
            status=PublishStatus.publishing,
            caption_text=data.caption_text or "",
            scheduled_at=data.scheduled_at,
        )
        db.add(pub)
        await db.flush()
        await db.refresh(pub)

        # Execute publish
        try:
            if platform == "youtube":
                result = await service.publish_to_youtube(
                    access_token="placeholder",
                    video_path=video.storage_url or "",
                    title=video.original_filename,
                    description=data.caption_text or "",
                )
            elif platform == "tiktok":
                result = await service.publish_to_tiktok(
                    access_token="placeholder",
                    video_path=video.storage_url or "",
                    caption=data.caption_text or "",
                )
            elif platform == "facebook":
                result = await service.publish_to_facebook(
                    access_token="placeholder",
                    video_path=video.storage_url or "",
                    description=data.caption_text or "",
                )
            else:
                raise ValueError(f"Unsupported platform: {platform}")

            pub.status = PublishStatus.published
            pub.platform_post_id = result.get("platform_post_id", "")
            pub.platform_url = result.get("platform_url", "")
            pub.published_at = func.now()
        except Exception as e:
            pub.status = PublishStatus.failed

        results.append({
            "platform": platform,
            "status": pub.status.value,
            "url": pub.platform_url,
        })

    await db.commit()
    return {"results": results}


@router.get("")
async def list_published(
    page: int = 1,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's published content."""
    offset = (page - 1) * limit
    q = (
        select(PublishedContent)
        .where(PublishedContent.user_id == user.id)
        .order_by(PublishedContent.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(q)
    items = result.scalars().all()

    cq = (
        select(func.count())
        .select_from(PublishedContent)
        .where(PublishedContent.user_id == user.id)
    )
    cr = await db.execute(cq)
    total = cr.scalar()

    return PublishedListResponse(
        items=[PublishedContentResponse.model_validate(i) for i in items],
        total=total,
    )
