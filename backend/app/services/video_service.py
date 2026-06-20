import yt_dlp
import asyncio
import concurrent.futures
import os
import uuid
from pathlib import Path

DOWNLOAD_DIR = Path("/tmp/youtube-downloads")
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)


class VideoService:
    async def download(self, url: str, source: str, quality: str = "1080p") -> dict:
        """Download video from supported platforms."""
        if "youtube" in source.lower():
            return await self._download_youtube(url, quality)
        elif "tiktok" in source.lower():
            return await self._download_tiktok(url)
        else:
            raise ValueError(f"Unsupported source: {source}")

    async def _download_youtube(self, url: str, quality: str) -> dict:
        task_id = str(uuid.uuid4())
        quality_map = {
            "360p": "best[height<=360]",
            "720p": "best[height<=720]",
            "1080p": "best[height<=1080]",
            "best": "best",
        }
        fmt = quality_map.get(quality, "best[height<=1080]")

        opts = {
            "format": fmt,
            "outtmpl": str(DOWNLOAD_DIR / f"{task_id}.%(ext)s"),
            "quiet": True,
            "no_warnings": True,
        }

        def run():
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=True)
                for ext in [".mp4", ".webm", ".mkv"]:
                    p = str(DOWNLOAD_DIR / f"{task_id}{ext}")
                    if os.path.exists(p):
                        return {
                            "task_id": task_id,
                            "file_path": p,
                            "title": info.get("title", "Unknown"),
                            "duration": info.get("duration"),
                            "thumbnail": info.get("thumbnail"),
                            "ext": ext.lstrip("."),
                        }
                raise FileNotFoundError(f"Downloaded file not found for {task_id}")

        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return await loop.run_in_executor(pool, run)

    async def _download_tiktok(self, url: str) -> dict:
        task_id = str(uuid.uuid4())
        opts = {
            "format": "best",
            "outtmpl": str(DOWNLOAD_DIR / f"{task_id}.%(ext)s"),
            "quiet": True,
            "no_warnings": True,
        }

        def run():
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=True)
                for ext in [".mp4", ".webm"]:
                    p = str(DOWNLOAD_DIR / f"{task_id}{ext}")
                    if os.path.exists(p):
                        return {
                            "task_id": task_id,
                            "file_path": p,
                            "title": info.get("title", "Unknown"),
                            "duration": info.get("duration"),
                            "thumbnail": info.get("thumbnail"),
                            "ext": ext.lstrip("."),
                        }
                raise FileNotFoundError(f"TikTok download failed for {task_id}")

        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return await loop.run_in_executor(pool, run)
