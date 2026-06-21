from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.models.user import User
from app.models.published_content import PublishedContent, PublishStatus
from app.schemas.publish import PublishedContentResponse
from app.core.security import get_current_user
from datetime import datetime, timezone
from uuid import UUID

router = APIRouter()


@router.get("")
async def list_schedules(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    status: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List scheduled content with optional status filter."""
    conditions = [PublishedContent.user_id == user.id]
    if status:
        conditions.append(PublishedContent.status == PublishStatus(status))

    cq = select(func.count()).select_from(PublishedContent).where(and_(*conditions))
    cr = await db.execute(cq)
    total = cr.scalar()

    offset = (page - 1) * limit
    q = (
        select(PublishedContent)
        .where(and_(*conditions))
        .order_by(PublishedContent.scheduled_at.asc().nullslast(), PublishedContent.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(q)
    items = result.scalars().all()

    return {
        "items": [PublishedContentResponse.model_validate(i) for i in items],
        "total": total,
    }


@router.get("/calendar")
async def get_calendar(
    year: int = Query(..., ge=2024, le=2030),
    month: int = Query(..., ge=1, le=12),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get scheduled items for a specific month (calendar view)."""
    from calendar import monthrange

    _, last_day = monthrange(year, month)
    month_start = datetime(year, month, 1, tzinfo=timezone.utc)
    month_end = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)

    q = (
        select(PublishedContent)
        .where(
            PublishedContent.user_id == user.id,
            PublishedContent.scheduled_at >= month_start,
            PublishedContent.scheduled_at <= month_end,
        )
        .order_by(PublishedContent.scheduled_at.asc())
    )
    result = await db.execute(q)
    items = result.scalars().all()

    # Group by day
    by_day: dict[str, list] = {}
    for item in items:
        if item.scheduled_at:
            day_key = item.scheduled_at.strftime("%Y-%m-%d")
            if day_key not in by_day:
                by_day[day_key] = []
            by_day[day_key].append({
                "id": str(item.id),
                "video_id": str(item.video_id) if item.video_id else None,
                "platform": item.platform,
                "status": item.status.value if hasattr(item.status, 'value') else str(item.status),
                "scheduled_at": item.scheduled_at.isoformat(),
            })

    return {
        "year": year,
        "month": month,
        "days": by_day,
        "total": len(items),
    }


@router.patch("/{schedule_id}")
async def update_schedule(
    schedule_id: UUID,
    scheduled_at: datetime | None = None,
    caption_text: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a scheduled publish (time, caption)."""
    q = select(PublishedContent).where(
        PublishedContent.id == schedule_id,
        PublishedContent.user_id == user.id,
    )
    result = await db.execute(q)
    pub = result.scalar_one_or_none()
    if not pub:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if pub.status != PublishStatus.scheduled:
        raise HTTPException(status_code=400, detail="Can only update scheduled items")

    if scheduled_at is not None:
        pub.scheduled_at = scheduled_at
    if caption_text is not None:
        pub.caption_text = caption_text

    await db.commit()
    return {"status": "updated"}


@router.delete("/{schedule_id}")
async def cancel_schedule(
    schedule_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a scheduled publish."""
    q = select(PublishedContent).where(
        PublishedContent.id == schedule_id,
        PublishedContent.user_id == user.id,
    )
    result = await db.execute(q)
    pub = result.scalar_one_or_none()
    if not pub:
        raise HTTPException(status_code=404, detail="Schedule not found")

    if pub.status == PublishStatus.scheduled:
        pub.status = PublishStatus.failed
        await db.commit()

    return {"status": "cancelled"}
