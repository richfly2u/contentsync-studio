from sqlalchemy import Column, String, Integer, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum
import uuid


class TranscriptLanguage(str, enum.Enum):
    zh = "zh"
    en = "en"


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    video_id = Column(
        UUID(as_uuid=True),
        ForeignKey("videos.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    raw_text = Column(Text)
    cleaned_text = Column(Text)
    optimized_text = Column(Text)
    summary = Column(Text)
    language = Column(Enum(TranscriptLanguage), default=TranscriptLanguage.zh)
    word_count = Column(Integer)
    processing_time_ms = Column(Integer)
    ai_model = Column(String, default="whisper-1+gpt-4o")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
