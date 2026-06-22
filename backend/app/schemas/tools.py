from pydantic import BaseModel, HttpUrl
from typing import Optional


class AudioExtractRequest(BaseModel):
    url: HttpUrl
    platform: Optional[str] = "auto"


class AudioExtractResponse(BaseModel):
    success: bool
    title: str
    audio_url: Optional[str] = None
    duration_seconds: Optional[int] = None
    error: Optional[str] = None


class OCRRequest(BaseModel):
    image_url: HttpUrl
    language: str = "chi_sim+eng"


class OCRResponse(BaseModel):
    success: bool
    text: str
    language_detected: Optional[str] = None
    error: Optional[str] = None


class CaptionExtractRequest(BaseModel):
    url: HttpUrl
    language: str = "auto"


class CaptionExtractResponse(BaseModel):
    success: bool
    title: str
    captions_raw: Optional[str] = None
    captions_cleaned: Optional[str] = None
    duration_seconds: Optional[int] = None
    error: Optional[str] = None


class VideoDownloadRequest(BaseModel):
    url: HttpUrl
    platform: Optional[str] = "auto"
    remove_watermark: bool = False


class VideoDownloadResponse(BaseModel):
    success: bool
    title: str
    video_url: Optional[str] = None
    duration_seconds: Optional[int] = None
    filesize_mb: Optional[float] = None
    error: Optional[str] = None
