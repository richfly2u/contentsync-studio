from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum
import uuid


class PlatformName(str, enum.Enum):
    youtube = "youtube"
    tiktok = "tiktok"
    xiaohongshu = "xiaohongshu"
    facebook = "facebook"


class PlatformConnection(Base):
    __tablename__ = "platform_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    platform = Column(Enum(PlatformName), nullable=False)
    access_token = Column(String, default="")
    refresh_token = Column(String, default="")
    platform_user_id = Column(String, default="")
    platform_username = Column(String, default="")
    expires_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
