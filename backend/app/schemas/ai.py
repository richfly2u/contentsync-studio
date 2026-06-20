from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class TranscriptResponse(BaseModel):
    id: UUID
    video_id: UUID
    raw_text: Optional[str]
    cleaned_text: Optional[str]
    optimized_text: Optional[str]
    summary: Optional[str]
    language: str
    word_count: Optional[int]
    ai_model: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AIJobStatus(BaseModel):
    job_id: str
    status: str
    result: Optional[dict] = None
