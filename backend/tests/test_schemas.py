"""Schema and model unit tests - no database required."""
import sys
import os
import uuid
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Test schemas
from app.schemas.user import UserResponse
from app.schemas.video import VideoImportRequest, VideoResponse, VideoListResponse, VideoSource
from app.schemas.ai import TranscriptResponse, AIJobStatus
from app.schemas.publish import PublishRequest, PublishedContentResponse, PublishedListResponse


def test_user_schema():
    """Test UserResponse schema creation."""
    user = UserResponse(
        id=uuid.uuid4(),
        email="test@example.com",
        name="Test User",
        avatar_url="https://example.com/avatar.png",
        plan="free",
        credits_remaining=5,
        created_at=datetime.now(),
    )
    assert user.email == "test@example.com"
    assert user.plan == "free"
    assert user.credits_remaining == 5
    print("  ✅ UserResponse schema OK")


def test_video_import_request():
    """Test VideoImportRequest validation."""
    req = VideoImportRequest(
        url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        source=VideoSource.youtube_download,
    )
    assert str(req.url) == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    assert req.source == "youtube_download"
    print("  ✅ VideoImportRequest schema OK")


def test_video_response():
    """Test VideoResponse schema."""
    video = VideoResponse(
        id=uuid.uuid4(),
        source="youtube_download",
        source_url="https://youtube.com/watch?v=test",
        storage_url="/tmp/test.mp4",
        original_filename="Test Video",
        duration_seconds=120,
        file_size_bytes=50000000,
        status="ready",
        language="zh",
        thumbnail_url="https://img.youtube.com/vi/test/hqdefault.jpg",
        error_message=None,
        created_at=datetime.now(),
    )
    assert video.status == "ready"
    assert video.duration_seconds == 120
    assert video.language == "zh"
    print("  ✅ VideoResponse schema OK")


def test_transcript_schema():
    """Test TranscriptResponse schema."""
    transcript = TranscriptResponse(
        id=uuid.uuid4(),
        video_id=uuid.uuid4(),
        raw_text="This is a test transcript with um filler words",
        cleaned_text="This is a test transcript with filler words",
        optimized_text="This is an optimized test transcript.",
        summary="A test transcript.",
        language="en",
        word_count=12,
        ai_model="whisper-1+gpt-4o",
        created_at=datetime.now(),
    )
    assert transcript.language == "en"
    assert transcript.ai_model == "whisper-1+gpt-4o"
    assert transcript.word_count == 12
    print("  ✅ TranscriptResponse schema OK")


def test_ai_job_status():
    """Test AIJobStatus schema."""
    job = AIJobStatus(job_id="celery-job-123", status="PROGRESS")
    assert job.job_id == "celery-job-123"
    assert job.status == "PROGRESS"
    assert job.result is None
    print("  ✅ AIJobStatus schema OK")


def test_publish_request():
    """Test PublishRequest schema."""
    req = PublishRequest(
        video_id=uuid.uuid4(),
        platforms=["youtube", "tiktok"],
        caption_text="Check out this video! #test",
    )
    assert len(req.platforms) == 2
    assert "youtube" in req.platforms
    assert req.caption_text == "Check out this video! #test"
    print("  ✅ PublishRequest schema OK")


def test_video_enum_values():
    """Test VideoSource enum values match expected."""
    assert VideoSource.youtube_download.value == "youtube_download"
    assert VideoSource.tiktok_download.value == "tiktok_download"
    assert VideoSource.xhs_download.value == "xhs_download"
    assert VideoSource.upload.value == "upload"
    print("  ✅ VideoSource enum OK")


if __name__ == "__main__":
    print("\n🧪 Schema & Model Tests\n")
    test_user_schema()
    test_video_import_request()
    test_video_response()
    test_transcript_schema()
    test_ai_job_status()
    test_publish_request()
    test_video_enum_values()
    print("\n✅ All tests passed!\n")
