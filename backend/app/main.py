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


# ─── YouTube 影片解析（取得所有格式列表，對應前端 /api/tools/video-download）───


from pydantic import BaseModel, HttpUrl
from typing import Optional


class YtFormatRequest(BaseModel):
    url: HttpUrl
    language: Optional[str] = "zh"


def _parse_yt_formats_sync(url: str) -> dict:
    import yt_dlp

    opts = {
        "quiet": True,
        "no_warnings": True,
        "no_download": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)
        title = info.get("title", "YouTube 影片") or ""
        duration = info.get("duration", 0)
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

            # Video format (has video, may or may not have audio)
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

            # Audio format (audio only)
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

        # Sort video by height desc, audio by bitrate desc
        video_formats.sort(key=lambda x: -x["height"])
        audio_formats.sort(key=lambda x: -x["bitrate"])

        return {
            "success": True,
            "title": title,
            "thumbnail": thumbnail,
            "duration_seconds": duration,
            "duration_formatted": duration_fmt,
            "platform": "YouTube",
            "videoFormats": video_formats,
            "audioFormats": audio_formats,
        }


@app.post("/api/tools/video-download")
async def youtube_video_formats(data: YtFormatRequest):
    try:
        import asyncio, concurrent.futures
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            result = await loop.run_in_executor(pool, _parse_yt_formats_sync, str(data.url))
        return result
    except Exception as e:
        return {"success": False, "error": f"解析失敗：{str(e)}"}
