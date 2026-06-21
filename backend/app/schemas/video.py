from pydantic import BaseModel, HttpUrl
from uuid import UUID
from datetime import datetime
from typing import Optional
from enum import Enum


class VideoSource(str, Enum):
    youtube_download = "youtube_download"
    tiktok_download = "tiktok_download"
    xhs_download = "xhs_download"
    facebook_download = "facebook_download"
    upload = "upload"


class VideoImportRequest(BaseModel):
    url: HttpUrl
    source: VideoSource
    quality: str = "1080p"


class VideoResponse(BaseModel):
    id: UUID
    source: str
    source_url: Optional[str]
    storage_url: Optional[str]
    original_filename: str
    duration_seconds: Optional[int]
    file_size_bytes: Optional[int]
    status: str
    language: Optional[str]
    thumbnail_url: Optional[str]
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class VideoListResponse(BaseModel):
    items: list[VideoResponse]
    total: int
