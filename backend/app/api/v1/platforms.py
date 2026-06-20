from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.user import User
from app.models.platform_connection import PlatformConnection, PlatformName
from app.schemas.publish import PlatformConnectionResponse
from app.core.security import get_current_user
import uuid

router = APIRouter()


@router.get("")
async def list_platforms(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's connected platforms."""
    q = select(PlatformConnection).where(
        PlatformConnection.user_id == user.id,
        PlatformConnection.is_active == True,
    )
    result = await db.execute(q)
    connections = result.scalars().all()

    return {
        "platforms": [PlatformConnectionResponse.model_validate(c) for c in connections],
        "available": [
            {"id": "youtube", "name": "YouTube"},
            {"id": "tiktok", "name": "TikTok"},
            {"id": "xiaohongshu", "name": "小紅書"},
            {"id": "facebook", "name": "Facebook"},
        ],
    }


@router.post("/{platform}/connect")
async def connect_platform(
    platform: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Connect a social platform (placeholder - full OAuth in Phase 2)."""
    try:
        platform_enum = PlatformName(platform)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")

    # Check if already connected
    q = select(PlatformConnection).where(
        PlatformConnection.user_id == user.id,
        PlatformConnection.platform == platform_enum,
    )
    result = await db.execute(q)
    existing = result.scalar_one_or_none()

    if existing:
        existing.is_active = True
    else:
        conn = PlatformConnection(
            user_id=user.id,
            platform=platform_enum,
            platform_username=f"{user.name or user.email} ({platform})",
            is_active=True,
        )
        db.add(conn)

    await db.commit()
    return {"status": "connected", "platform": platform}


@router.post("/{platform}/disconnect")
async def disconnect_platform(
    platform: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Disconnect a social platform."""
    try:
        platform_enum = PlatformName(platform)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")

    q = select(PlatformConnection).where(
        PlatformConnection.user_id == user.id,
        PlatformConnection.platform == platform_enum,
    )
    result = await db.execute(q)
    conn = result.scalar_one_or_none()

    if conn:
        conn.is_active = False
        await db.commit()

    return {"status": "disconnected", "platform": platform}
