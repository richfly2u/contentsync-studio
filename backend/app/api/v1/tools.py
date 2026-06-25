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
    CaptionExtractRequest,
    CaptionExtractResponse,
)

router = APIRouter()
client = AsyncOpenAI(api_key=settings.openai_api_key)

TOOLS_DIR = Path("/tmp/contentsync-tools")
TOOLS_DIR.mkdir(parents=True, exist_ok=True)


# ─── helpers ────────────────────────────────────────────────────────


def _parse_video_sync(url: str) -> dict:
    """Parse video URL WITHOUT downloading — extract direct CDN links and metadata.
    Fast — returns in 1-3 seconds instead of waiting for full download."""
    import yt_dlp

    task_id = str(uuid.uuid4())
    opts = {
        "quiet": True,
        "no_warnings": True,
        "no_download": True,  # no_download is the yt-dlp flag
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)
        # Find best available video format
        formats = info.get("formats", [])
        best_video = None
        for f in formats:
            if f.get("vcodec") and f.get("vcodec") != "none":
                height = f.get("height", 0)
                if best_video is None or height > best_video.get("height", 0):
                    best_video = f
        video_url = best_video.get("url", "") if best_video else ""

        return {
            "task_id": task_id,
            "title": info.get("title", "影片"),
            "duration": info.get("duration"),
            "video_url": video_url,
            "thumbnail": info.get("thumbnail"),
            "ext": best_video.get("ext", "mp4") if best_video else "mp4",
        }


async def _parse_video(url: str) -> dict:
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as pool:
        return await loop.run_in_executor(pool, _parse_video_sync, url)


def _download_video_sync(url: str) -> dict:
    """Download a video using yt-dlp (blocking) — for audio/caption processing only."""
    import yt_dlp

    task_id = str(uuid.uuid4())
    opts = {
        "format": "bestaudio+bestvideo[height<=360]/best[height<=360]",
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


# ─── 1. 影片解析（不下載，秒回 direct URL）──────────────────────────


@router.post("/video-download", response_model=VideoDownloadResponse)
async def video_download_endpoint(data: VideoDownloadRequest):
    """Parse video URL and return direct CDN download link — no server-side download."""
    try:
        video = await _parse_video(str(data.url))
        file_size = 0

        return VideoDownloadResponse(
            success=True,
            title=video["title"],
            video_url=video["video_url"],
            duration_seconds=video["duration"],
            filesize_mb=round(file_size, 1),
        )
    except Exception as e:
        return VideoDownloadResponse(
            success=False,
            title="",
            error=f"解析失敗：{str(e)}",
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
