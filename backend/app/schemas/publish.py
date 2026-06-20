from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class PublishRequest(BaseModel):
    video_id: UUID
    platforms: list[str]
    caption_text: Optional[str] = ""
    scheduled_at: Optional[datetime] = None


class PublishedContentResponse(BaseModel):
    id: UUID
    video_id: Optional[UUID]
    platform: str
    platform_post_id: str
    platform_url: str
    status: str
    caption_text: Optional[str]
    scheduled_at: Optional[datetime]
    published_at: Optional[datetime]
    views_count: int
    likes_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class PublishedListResponse(BaseModel):
    items: list[PublishedContentResponse]
    total: int


class PlatformConnectionResponse(BaseModel):
    id: UUID
    platform: str
    platform_username: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
