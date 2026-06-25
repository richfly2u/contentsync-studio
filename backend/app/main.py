from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.router import api_router
from app.core.database import engine, Base

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


# ─── 通用影片/內容解析（支援 YouTube + 小紅書 + 多平台）───


from pydantic import BaseModel, HttpUrl
from typing import Optional


class YtFormatRequest(BaseModel):
    url: HttpUrl
    language: Optional[str] = "zh"


import re


def _detect_platform(url: str) -> str:
    """Detect content platform from URL."""
    url_lower = url.lower()
    if "youtube" in url_lower or "youtu.be" in url_lower:
        return "youtube"
    if "xiaohongshu" in url_lower or "xhslink" in url_lower or "rednote" in url_lower:
        return "xiaohongshu"
    if "douyin" in url_lower or "iesdouyin" in url_lower:
        return "douyin"
    if "tiktok" in url_lower:
        return "tiktok"
    if "bilibili" in url_lower or "b23.tv" in url_lower:
        return "bilibili"
    if "instagram" in url_lower:
        return "instagram"
    return "other"


def _parse_youtube(url: str) -> dict:
    """Parse YouTube video and return all available formats."""
    import yt_dlp

    opts = {
        "quiet": True,
        "no_warnings": True,
        "no_download": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)
        title = info.get("title", "YouTube 影片") or ""
        duration = int(info.get("duration", 0) or 0)
        thumbnail = info.get("thumbnail", "")
        duration_fmt = f"{duration // 60}:{duration % 60:02d}" if duration else "0:00"

        raw_formats = info.get("formats", [])

        video_formats = []
        audio_formats = []
        seen_audio_bitrates = set()

        for f in raw_formats:
            ext = f.get("ext", "")
            vcodec = f.get("vcodec", "none")
            acodec = f.get("acodec", "none")
            height = f.get("height", 0)
            bitrate = f.get("tbr", 0) or f.get("abr", 0) or 0
            url = f.get("url", "")
            filesize = f.get("filesize", 0) or f.get("filesize_approx", 0) or 0
            size_mb = f"{filesize / 1024 / 1024:.1f} MB" if filesize else "?"

            quality_label = {
                2160: "4K", 1440: "2K", 1080: "1080p", 720: "720p",
                480: "480p", 360: "360p", 240: "240p", 144: "144p",
            }.get(height, f"{height}p")

            if vcodec and vcodec != "none" and ext in ("mp4", "webm", "avi"):
                video_formats.append({
                    "quality": quality_label,
                    "height": height,
                    "url": url,
                    "size_mb": size_mb,
                    "ext": ext,
                    "has_audio": acodec and acodec != "none",
                    "has_video": True,
                })

            if acodec and acodec != "none" and (not vcodec or vcodec == "none") and ext in ("m4a", "mp3", "webm"):
                br_key = round(bitrate)
                if br_key not in seen_audio_bitrates:
                    seen_audio_bitrates.add(br_key)
                    audio_formats.append({
                        "quality": f"{br_key} kbps",
                        "bitrate": br_key,
                        "url": url,
                        "size_mb": size_mb,
                        "ext": "m4a" if ext == "m4a" else "mp3",
                    })

        video_formats.sort(key=lambda x: -x["height"])
        audio_formats.sort(key=lambda x: -x["bitrate"])

        return {
            "success": True,
            "title": title,
            "thumbnail": thumbnail,
            "duration_seconds": duration,
            "duration_formatted": duration_fmt,
            "platform": "YouTube",
            "type": "video",
            "videoFormats": video_formats,
            "audioFormats": audio_formats,
        }


def _parse_xiaohongshu(url: str) -> dict:
    """Parse Xiaohongshu note — supports both image posts and video posts."""
    import yt_dlp

    opts = {
        "quiet": True,
        "no_warnings": True,
        "no_download": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)

        title = info.get("title", "小紅書筆記") or ""
        description = info.get("description", "") or ""

        # Detect type: video or image post
        # yt-dlp returns 'entries' for image posts (playlist-like), single video for video posts
        entries = info.get("entries") or []
        images = []
        video_url = None
        thumbnail = info.get("thumbnail", "") or ""

        if entries:
            # Image post — each entry is an image
            for entry in entries:
                img_url = entry.get("url") or entry.get("thumbnail") or ""
                if img_url:
                    images.append({
                        "url": img_url,
                        "width": entry.get("width", 0),
                        "height": entry.get("height", 0),
                    })
                if not thumbnail:
                    thumbnail = entry.get("thumbnail") or ""
        else:
            # Video post or single media
            video_url = info.get("url") or ""
            if not thumbnail:
                thumbnail = info.get("thumbnail") or ""
            # Also try to get requested_formats for better quality
            req_fmts = info.get("requested_formats") or []
            for fmt in req_fmts:
                if fmt.get("vcodec", "none") != "none":
                    video_url = fmt.get("url") or video_url
                    break

        # Try to extract images from thumbnails if we couldn't get entries
        if not images and info.get("thumbnails"):
            for t in info.get("thumbnails", []):
                t_url = t.get("url", "")
                if t_url and t.get("id") != "0":
                    images.append({
                        "url": t_url,
                        "width": t.get("width", 0),
                        "height": t.get("height", 0),
                    })

        # Deduplicate images
        seen = set()
        deduped = []
        for img in images:
            if img["url"] not in seen:
                seen.add(img["url"])
                deduped.append(img)
        images = deduped

        return {
            "success": True,
            "title": title,
            "description": description,
            "thumbnail": thumbnail,
            "platform": "小紅書",
            "type": "images" if images else "video",
            "images": images,
            "videoUrl": video_url or None,
            "imageCount": len(images),
            "totalImages": len(images),
        }


def _parse_content_sync(url: str) -> dict:
    """Detect platform and dispatch to appropriate parser."""
    platform = _detect_platform(url)

    if platform == "xiaohongshu":
        return _parse_xiaohongshu(url)
    else:
        # YouTube and others via yt-dlp
        return _parse_youtube(url)


@app.post("/api/tools/video-download")
async def video_download_endpoint(data: YtFormatRequest):
    try:
        import asyncio, concurrent.futures
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            result = await loop.run_in_executor(pool, _parse_content_sync, str(data.url))
        return result
    except Exception as e:
        return {"success": False, "error": f"解析失敗：{str(e)}"}
