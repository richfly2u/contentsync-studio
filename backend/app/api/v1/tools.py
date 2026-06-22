import asyncio
import concurrent.futures
import json
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from openai import AsyncOpenAI

from app.core.config import settings
from app.schemas.tools import (
    AudioExtractRequest,
    AudioExtractResponse,
    OCRRequest,
    OCRResponse,
    CaptionExtractRequest,
    CaptionExtractResponse,
)

router = APIRouter()
client = AsyncOpenAI(api_key=settings.openai_api_key)

TOOLS_DIR = Path("/tmp/contentsync-tools")
TOOLS_DIR.mkdir(parents=True, exist_ok=True)


# ─── helpers ────────────────────────────────────────────────────────


def _download_video_sync(url: str) -> dict:
    """Download a video using yt-dlp (blocking, runs in executor)."""
    import yt_dlp

    task_id = str(uuid.uuid4())
    opts = {
        "format": "best[height<=720]",  # smaller for faster processing
        "outtmpl": str(TOOLS_DIR / f"{task_id}.%(ext)s"),
        "quiet": True,
        "no_warnings": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        for ext in [".mp4", ".webm", ".mkv"]:
            p = str(TOOLS_DIR / f"{task_id}{ext}")
            if os.path.exists(p):
                return {
                    "task_id": task_id,
                    "file_path": p,
                    "title": info.get("title", "影片"),
                    "duration": info.get("duration"),
                    "ext": ext.lstrip("."),
                }
        raise FileNotFoundError(f"Download failed for {task_id}")


async def _download_video(url: str) -> dict:
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as pool:
        return await loop.run_in_executor(pool, _download_video_sync, url)


def _extract_audio_sync(video_path: str) -> str:
    """Extract audio track from video (blocking, runs in executor)."""
    import subprocess

    audio_path = video_path + ".mp3"
    subprocess.run(
        [
            "ffmpeg", "-i", video_path,
            "-vn", "-acodec", "libmp3lame",
            "-ac", "1", "-ar", "16000",
            "-q:a", "5",
            audio_path,
        ],
        capture_output=True,
        check=True,
    )
    return audio_path


async def _extract_audio(video_path: str) -> str:
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as pool:
        return await loop.run_in_executor(pool, _extract_audio_sync, video_path)


# ─── 1. 影片轉音頻 MP3 ──────────────────────────────────────────────


@router.post("/extract-audio", response_model=AudioExtractResponse)
async def extract_audio_endpoint(data: AudioExtractRequest):
    """Download video from a link → extract audio as MP3 → return download URL."""
    try:
        video = await _download_video(str(data.url))
        audio_path = await _extract_audio(video["file_path"])

        audio_url = f"/api/v1/tools/download/{Path(audio_path).name}"

        return AudioExtractResponse(
            success=True,
            title=video["title"],
            audio_url=audio_url,
            duration_seconds=video["duration"],
        )
    except Exception as e:
        return AudioExtractResponse(
            success=False,
            title="",
            error=f"處理失敗：{str(e)}",
        )


# ─── 2. 圖片文字提取 OCR (GPT-4o Vision) ──────────────────────────


@router.post("/ocr", response_model=OCRResponse)
async def ocr_endpoint(data: OCRRequest):
    """Extract text from an image using GPT-4o vision (supports any image URL)."""
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "你是專業的文字辨識助手。請從圖片中提取所有可見的文字內容。"
                        "如果文字是中文，保留繁體/簡體原貌。"
                        "輸出純文字，不要 markdown 格式，不要添加任何說明。"
                        "如果圖片中沒有文字，輸出「未偵測到文字」。"
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "請辨識這張圖片中的所有文字"},
                        {"type": "image_url", "image_url": {"url": str(data.image_url)}},
                    ],
                },
            ],
            max_tokens=4096,
            temperature=0.1,
        )
        text = response.choices[0].message.content or ""
        return OCRResponse(
            success=True,
            text=text,
            language_detected="auto",
        )
    except Exception as e:
        return OCRResponse(
            success=False,
            text="",
            error=f"OCR 辨識失敗：{str(e)}",
        )


# ─── 3. 一鍵文案提取 (下載+轉寫) ──────────────────────────────────


@router.post("/extract-caption", response_model=CaptionExtractResponse)
async def extract_caption_endpoint(data: CaptionExtractRequest):
    """Download video → transcribe audio → clean transcript → return text."""
    try:
        video = await _download_video(str(data.url))
        audio_path = await _extract_audio(video["file_path"])

        # Transcribe with Whisper
        with open(audio_path, "rb") as f:
            whisper_resp = await client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                response_format="verbose_json",
            )
        raw_text = whisper_resp.text

        # Clean transcript via GPT
        clean_resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "你是一個專業的文稿編輯。移除以下文字中的口頭禪、重複詞、"
                        "filler words（如：嗯、啊、那個、就是說、然後）。"
                        "保持原意，不要改寫內容。只輸出乾淨的文字。"
                    ),
                },
                {"role": "user", "content": raw_text},
            ],
            temperature=0.3,
            max_tokens=4000,
        )
        cleaned = clean_resp.choices[0].message.content or raw_text

        return CaptionExtractResponse(
            success=True,
            title=video["title"],
            captions_raw=raw_text,
            captions_cleaned=cleaned,
            duration_seconds=video["duration"],
        )
    except Exception as e:
        return CaptionExtractResponse(
            success=False,
            title="",
            error=f"文案提取失敗：{str(e)}",
        )


# ─── 4. 影片下載（AnyToCopy 風格 — 貼連結→下載 MP4） ───────────────


@router.post("/video-download", response_model=VideoDownloadResponse)
async def video_download_endpoint(data: VideoDownloadRequest):
    """Download video from a social media link → return MP4 download URL."""
    try:
        video = await _download_video(str(data.url))
        file_path = video["file_path"]
        file_size = os.path.getsize(file_path) / (1024 * 1024)  # MB

        video_url = f"/api/v1/tools/download/{Path(file_path).name}"

        return VideoDownloadResponse(
            success=True,
            title=video["title"],
            video_url=video_url,
            duration_seconds=video["duration"],
            filesize_mb=round(file_size, 1),
        )
    except Exception as e:
        return VideoDownloadResponse(
            success=False,
            title="",
            error=f"下載失敗：{str(e)}",
        )


# ─── 5. 檔案下載（搭配 extract-audio / video-download 回傳） ────────


@router.get("/download/{filename}")
async def download_file(filename: str):
    """Serve temporary files (audio/zip etc.)."""
    from fastapi.responses import FileResponse

    file_path = TOOLS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found or expired")
    return FileResponse(str(file_path), media_type="audio/mpeg", filename=filename)
