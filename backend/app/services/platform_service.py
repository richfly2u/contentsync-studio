"""Platform service - wraps social media APIs for publishing videos."""


class PlatformService:
    """Handles publishing video content to connected platforms."""

    @staticmethod
    async def publish_to_youtube(
        access_token: str,
        video_path: str,
        title: str,
        description: str = "",
        privacy: str = "public",
    ) -> dict:
        """Publish video to YouTube using Data API v3.
        
        In Phase 1 MVP, this prints a placeholder.
        Full implementation requires Google API client library.
        """
        # Placeholder for Phase 1
        print(f"[YOUTUBE] Would publish: {title}")
        print(f"[YOUTUBE] Video: {video_path}")
        print(f"[YOUTUBE] Description: {description[:100]}...")
        return {
            "platform_post_id": "placeholder_youtube_id",
            "platform_url": f"https://youtube.com/watch?v=placeholder",
            "status": "published",
        }

    @staticmethod
    async def publish_to_tiktok(
        access_token: str,
        video_path: str,
        caption: str = "",
    ) -> dict:
        """Publish video to TikTok.
        
        In Phase 1 MVP, this prints a placeholder.
        Requires TikTok API for Business.
        """
        print(f"[TIKTOK] Would publish with caption: {caption[:100]}")
        return {
            "platform_post_id": "placeholder_tiktok_id",
            "platform_url": "https://tiktok.com/@user/video/placeholder",
            "status": "published",
        }

    @staticmethod
    async def publish_to_xiaohongshu(
        cookies: str,
        video_path: str,
        title: str,
        description: str = "",
    ) -> dict:
        """Publish to Xiaohongshu/Rednote.

        No official API available. Returns a publishing guide for manual
        upload. Playwright automation reserved for future upgrade.
        """
        guide = (
            f"📱 **小紅書發布指引**\n\n"
            f"**影片標題：** {title}\n"
            f"**影片位置：** {video_path}\n"
            f"**文案：** {description[:200]}{'...' if len(description) > 200 else ''}\n\n"
            f"**手動發布步驟：**\n"
            f"1. 打開小紅書 App 或 Creator Platform\n"
            f"2. 點「+」發布新內容\n"
            f"3. 從以下位置選取影片：{video_path}\n"
            f"4. 貼上以上文案\n"
            f"5. 點「發布」\n\n"
            f"⏳ 未來升級：Playwright 自動發布（需登入 cookie）"
        )

        print(f"[XIAOHONGSHU] Publishing guide for: {title}")
        print(guide)

        return {
            "platform_post_id": "",
            "platform_url": "",
            "status": "guide_generated",
            "guide": guide,
        }

    @staticmethod
    async def publish_to_facebook(
        access_token: str,
        video_path: str,
        description: str = "",
        page_id: str = "me",
    ) -> dict:
        """Publish video to Facebook using Graph API."""
        print(f"[FACEBOOK] Would publish: {description[:100]}")
        return {
            "platform_post_id": "placeholder_fb_id",
            "platform_url": "https://facebook.com/watch/?v=placeholder",
            "status": "published",
        }
