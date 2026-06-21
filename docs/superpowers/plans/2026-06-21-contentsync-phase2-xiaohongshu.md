# ContentSync Studio Phase 2 — 小紅書下載 + 發布

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Xiaohongshu (小紅書/Rednote) video download and publish support to ContentSync Studio.

**Architecture:** yt-dlp handles xiaohongshu URL resolution and download (same as YouTube/TikTok). For publishing, generate a user guide (no official API — user manually publishes). Playwright automation architecture reserved for future use.

**Tech Stack:** yt-dlp, FastAPI, Celery, Python

---

## File Structure

### Modified files:
- `backend/app/services/video_service.py` — Add `_download_xiaohongshu()` method
- `backend/app/services/platform_service.py` — Implement `publish_to_xiaohongshu()` with guide
- `backend/app/api/v1/publish.py` — Add `xiaohongshu` platform handler in publish_video
- `backend/tests/test_schemas.py` — Add test for `VideoSource.xhs_download`
- `frontend/src/app/dashboard/videos/new/page.tsx` — Add 小紅書 to source dropdown
- `frontend/src/app/dashboard/publish/[id]/page.tsx` — Add 小紅書 to platform selector

---

### Task 1: Add xiaohongshu download to VideoService

**Files:**
- Modify: `backend/app/services/video_service.py:15-86`

- [ ] **Step 1: Add `_download_xiaohongshu` method**

```python
async def _download_xiaohongshu(self, url: str) -> dict:
    """Download video from Xiaohongshu using yt-dlp."""
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
                        "title": info.get("title", "未知小紅書影片"),
                        "duration": info.get("duration"),
                        "thumbnail": info.get("thumbnail"),
                        "ext": ext.lstrip("."),
                    }
            raise FileNotFoundError(f"Xiaohongshu download failed for {task_id}")

    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as pool:
        return await loop.run_in_executor(pool, run)
```

- [ ] **Step 2: Add xiaohongshu case to the `download()` dispatcher**

In the `download()` method, add before the `else` clause:
```python
elif "xhs" in source.lower() or "xiaohongshu" in source.lower():
    return await self._download_xiaohongshu(url)
```

- [ ] **Step 3: Verify syntax**

Run: `python -c "import ast; ast.parse(open('backend/app/services/video_service.py').read()); print('OK')"`

Expected: `OK`

---

### Task 2: Implement publish_to_xiaohongshu guide

**Files:**
- Modify: `backend/app/services/platform_service.py:48-66`

- [ ] **Step 1: Replace the placeholder with guide-based implementation**

Replace the `publish_to_xiaohongshu` method:

```python
@staticmethod
async def publish_to_xiaohongshu(
    cookies: str,
    video_path: str,
    title: str,
    description: str = "",
) -> dict:
    """Publish to Xiaohongshu/Rednote.

    No official API available. Returns a publishing guide for manual
    upload. Playwright automation reserved for future Phase 2 upgrade.
    """
    guide = (
        f"📱 **小紅書發布指引**\n\n"
        f"**影片標題：** {title}\n"
        f"**影片位置：** {video_path}\n"
        f"**文案：** {description[:200]}{'...' if len(description) > 200 else ''}\n\n"
        f"**手動發布步驟：**\n"
        f"1. 打開小紅書 App 或 Creator Platform\n"
        f"2. 點「+」發布新內容\n"
        f"3. 從以下位置選取影片檔案：\n"
        f"   {video_path}\n"
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
```

- [ ] **Step 2: Syntax check**

Run: `python -c "import ast; ast.parse(open('backend/app/services/platform_service.py').read()); print('OK')"`

Expected: `OK`

---

### Task 3: Add xiaohongshu handler to publish API

**Files:**
- Modify: `backend/app/api/v1/publish.py:53-75`

- [ ] **Step 1: Add xiaohongshu case in the platform loop**

After the `elif platform == "facebook":` block, add:

```python
elif platform == "xiaohongshu":
    result = await service.publish_to_xiaohongshu(
        cookies="placeholder",
        video_path=video.storage_url or "",
        title=video.original_filename,
        description=data.caption_text or "",
    )
```

- [ ] **Step 2: Syntax check**

Run: `python -c "import ast; ast.parse(open('backend/app/api/v1/publish.py').read()); print('OK')"`

Expected: `OK`

---

### Task 4: Add schema test for xhs_download

**Files:**
- Modify: `backend/tests/test_schemas.py`

- [ ] **Step 1: Read the current test file**
- [ ] **Step 2: Add a test for VideoSource.xhs_download**

Search for the existing tests and add:

```python
def test_video_source_xhs_download():
    """VideoSource enum includes xhs_download."""
    from app.schemas.video import VideoSource
    assert VideoSource.xhs_download.value == "xhs_download"
```

- [ ] **Step 3: Run the test**

Run: `cd backend && python -m pytest tests/test_schemas.py -v -k "xhs" 2>&1`

Expected: PASS

---

### Task 5: Update frontend for 小紅書

**Files:**
- Modify: `frontend/src/app/dashboard/videos/new/page.tsx`
- Modify: `frontend/src/app/dashboard/publish/[id]/page.tsx`

- [ ] **Step 1: Check existing source dropdown**

Read the new video page to see the current source options.

- [ ] **Step 2: Add 小紅書 to source selection options**

Look for the source/platform options array and add `{ value: 'xhs_download', label: '小紅書' }`.

- [ ] **Step 3: Add 小紅書 to publish platform selector**

Look for the platform checkboxes/buttons and add `{ id: 'xiaohongshu', name: '小紅書' }`.

---

## Execution

After writing the plan, I'll execute each task inline. Start with Task 1.
