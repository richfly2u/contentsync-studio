from sqlalchemy import Column, String, Integer, BigInteger, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum
import uuid


class VideoSource(str, enum.Enum):
    upload = "upload"
    youtube_download = "youtube_download"
    tiktok_download = "tiktok_download"
    xhs_download = "xhs_download"


class VideoStatus(str, enum.Enum):
    uploading = "uploading"
    downloading = "downloading"
    processing = "processing"
    ready = "ready"
    failed = "failed"


class Video(Base):
    __tablename__ = "videos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source = Column(Enum(VideoSource), nullable=False)
    source_url = Column(String)
    storage_url = Column(String)
    original_filename = Column(String, default="未知影片")
    duration_seconds = Column(Integer)
    file_size_bytes = Column(BigInteger)
    status = Column(Enum(VideoStatus), default=VideoStatus.downloading, nullable=False)
    language = Column(String(2))
    thumbnail_url = Column(String)
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
