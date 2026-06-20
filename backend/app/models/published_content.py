from sqlalchemy import Column, String, Integer, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum
import uuid


class PublishStatus(str, enum.Enum):
    scheduled = "scheduled"
    publishing = "publishing"
    published = "published"
    failed = "failed"


class PublishedContent(Base):
    __tablename__ = "published_contents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    video_id = Column(
        UUID(as_uuid=True),
        ForeignKey("videos.id", ondelete="SET NULL"),
        nullable=True,
    )
    platform = Column(String, nullable=False)
    platform_post_id = Column(String, default="")
    platform_url = Column(String, default="")
    content_type = Column(String, default="video")
    status = Column(Enum(PublishStatus), default=PublishStatus.publishing)
    caption_text = Column(Text)
    scheduled_at = Column(DateTime(timezone=True))
    published_at = Column(DateTime(timezone=True))
    views_count = Column(Integer, default=0)
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
