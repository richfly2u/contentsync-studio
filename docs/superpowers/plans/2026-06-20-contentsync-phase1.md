# ContentSync Studio Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working MVP where a user can sign up, import a YouTube/TikTok video via link, have it transcribed and summarized by AI, and publish it to YouTube or TikTok.

**Architecture:** Next.js 14 (App Router) frontend + FastAPI backend + PostgreSQL + Celery for async tasks + Cloudflare R2 for storage. All services orchestrated via Docker Compose for dev.

**Tech Stack:** Next.js 14, Tailwind CSS, shadcn/ui, FastAPI, SQLAlchemy, Celery, Redis, PostgreSQL, yt-dlp, OpenAI Whisper API, GPT-4o, Docker Compose

**Project Root:** `/home/alan/projects/video-repurpose-saas/`

---

## File Structure

```
video-repurpose-saas/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
│
├── frontend/                          # Next.js 14 App Router
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── components.json                # shadcn/ui config
│   ├── middleware.ts                  # Auth middleware
│   ├── app/
│   │   ├── layout.tsx                 # Root layout + Providers
│   │   ├── page.tsx                   # Landing page
│   │   ├── globals.css
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx               # Dashboard overview
│   │   │   ├── videos/
│   │   │   │   ├── page.tsx           # Video list
│   │   │   │   ├── new/page.tsx       # Import/upload video
│   │   │   │   └── [id]/page.tsx      # Video detail + AI results
│   │   │   └── publish/
│   │   │       ├── page.tsx           # Published content list
│   │   │       └── [videoId]/page.tsx  # Publish flow
│   │   └── settings/
│   │       └── page.tsx
│   └── lib/
│       ├── api-client.ts              # API client (axios/fetch wrapper)
│       ├── auth.ts                    # Auth helpers
│       ├── i18n.ts                    # i18n (zh/en)
│       └── utils.ts                   # Utility functions
│
├── backend/                           # FastAPI
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/
│   ├── app/
│   │   ├── main.py                    # FastAPI app entry
│   │   ├── config.py                  # Settings (pydantic-settings)
│   │   ├── database.py                # SQLAlchemy engine + session
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── video.py
│   │   │   ├── transcript.py
│   │   │   ├── platform_connection.py
│   │   │   └── published_content.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── video.py
│   │   │   └── ai.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── videos.py
│   │   │   ├── ai.py
│   │   │   ├── publish.py
│   │   │   └── platforms.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── video_downloader.py    # yt-dlp wrapper
│   │   │   ├── ai_service.py          # Whisper + GPT calls
│   │   │   ├── platform_service.py    # Social API wrappers
│   │   │   └── storage.py             # R2/S3 upload
│   │   └── tasks/
│   │       ├── __init__.py
│   │       ├── celery_app.py          # Celery config
│   │       ├── video_tasks.py         # Async download tasks
│   │       └── ai_tasks.py            # Async AI processing tasks
│   └── tests/
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_videos.py
│       └── test_ai.py
│
└── docs/
    └── PROJECT_SPEC.md                # (already exists)
```

---

## Phase 1 Tasks

### Task 1: Project Scaffold (Docker + Backend + Frontend)

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `frontend/package.json`
- Create: `frontend/next.config.js`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `frontend/app/globals.css`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
version: "3.9"

services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: contentsync
      POSTGRES_USER: contentsync
      POSTGRES_PASSWORD: contentsync_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U contentsync"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file: .env
    environment:
      DATABASE_URL: postgresql+asyncpg://contentsync:contentsync_dev@db:5432/contentsync
      REDIS_URL: redis://redis:6379/0
    volumes:
      - ./backend:/app
      - downloads:/app/downloads
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  worker:
    build: ./backend
    env_file: .env
    environment:
      DATABASE_URL: postgresql+asyncpg://contentsync:contentsync_dev@db:5432/contentsync
      REDIS_URL: redis://redis:6379/0
    volumes:
      - ./backend:/app
      - downloads:/app/downloads
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: celery -A app.tasks.celery_app worker --loglevel=info

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    env_file: .env
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

volumes:
  pgdata:
  downloads:
```

- [ ] **Step 2: Create backend requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy[asyncio]==2.0.35
asyncpg==0.29.0
alembic==1.13.2
celery[redis]==5.4.0
redis==5.1.0
pydantic-settings==2.5.2
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.12
httpx==0.27.2
boto3==1.35.0
openai==1.51.0
yt-dlp==2024.8.6
python-dotenv==1.0.1
pytest==8.3.2
pytest-asyncio==0.24.0
```

- [ ] **Step 3: Create backend/app/config.py**

```python
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "ContentSync Studio"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://contentsync:contentsync_dev@localhost:5432/contentsync"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 1 day

    # Storage (Cloudflare R2 / S3 compatible)
    s3_endpoint_url: str | None = None
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    s3_bucket: str = "contentsync-videos"

    # OpenAI
    openai_api_key: str | None = None

    # YouTube API
    youtube_api_key: str | None = None

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 4: Create backend/app/database.py**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=settings.debug)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

- [ ] **Step 5: Create backend/app/main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine, Base
from app.routers import auth, videos, ai, publish, platforms

settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(videos.router, prefix="/api/v1/videos", tags=["videos"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["ai"])
app.include_router(publish.router, prefix="/api/v1/publish", tags=["publish"])
app.include_router(platforms.router, prefix="/api/v1/platforms", tags=["platforms"])


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
```

- [ ] **Step 6: Create frontend via `npx create-next-app` then add tailwind config**

Run:
```bash
cd /home/alan/projects/video-repurpose-saas
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

Expected: Creates `frontend/` directory with Next.js 14 boilerplate.

- [ ] **Step 7: Add shadcn/ui**

```bash
cd frontend
npx shadcn@latest init -d
npx shadcn@latest add button card input label separator toast dropdown-menu avatar badge
```

- [ ] **Step 8: Create .env.example**

```
# Database
DATABASE_URL=postgresql+asyncpg://contentsync:contentsync_dev@localhost:5432/contentsync

# Redis
REDIS_URL=redis://localhost:6379/0

# Auth
JWT_SECRET=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256

# OpenAI
OPENAI_API_KEY=sk-...

# YouTube
YOUTUBE_API_KEY=AIza...

# Storage (R2 / S3)
S3_ENDPOINT_URL=https://...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=contentsync-videos

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

- [ ] **Step 9: Create .gitignore**

```gitignore
# Python
__pycache__/
*.py[cod]
*.egg-info/
.venv/
venv/

# Node
node_modules/
.next/

# Environment
.env
.env.local

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Downloads
downloads/

# Docker
pgdata/
```

- [ ] **Step 10: Create backend Dockerfile**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system deps for yt-dlp + ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 11: Create frontend Dockerfile**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

CMD ["npm", "start"]
```

- [ ] **Step 12: Verify compose builds**

```bash
cd /home/alan/projects/video-repurpose-saas
docker compose build
```

Expected: All 4 services (db, redis, backend, frontend) build successfully.

- [ ] **Step 13: Commit scaffold**

```bash
cd /home/alan/projects/video-repurpose-saas
git init
git add -A
git commit -m "chore: initial project scaffold with Docker + FastAPI + Next.js"
```

---

### Task 2: Database Models + Alembic

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/video.py`
- Create: `backend/app/models/transcript.py`
- Create: `backend/app/models/platform_connection.py`
- Create: `backend/app/models/published_content.py`
- Modify: `backend/alembic.ini`
- Create: `backend/alembic/env.py`

- [ ] **Step 1: Create models/__init__.py**

```python
from app.models.user import User
from app.models.video import Video
from app.models.transcript import Transcript
from app.models.platform_connection import PlatformConnection
from app.models.published_content import PublishedContent
from app.database import Base

__all__ = [
    "User", "Video", "Transcript",
    "PlatformConnection", "PublishedContent",
    "Base",
]
```

- [ ] **Step 2: Create backend/app/models/user.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class PlanType(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    TEAM = "team"
    ENTERPRISE = "enterprise"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    plan: Mapped[PlanType] = mapped_column(SAEnum(PlanType), default=PlanType.FREE)
    credits_remaining: Mapped[int] = mapped_column(Integer, default=5)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    videos = relationship("Video", back_populates="user", cascade="all, delete-orphan")
    platform_connections = relationship("PlatformConnection", back_populates="user", cascade="all, delete-orphan")
    published_contents = relationship("PublishedContent", back_populates="user", cascade="all, delete-orphan")
```

- [ ] **Step 3: Create backend/app/models/video.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, BigInteger, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class VideoSource(str, enum.Enum):
    UPLOAD = "upload"
    YOUTUBE = "youtube_download"
    TIKTOK = "tiktok_download"
    XIAOHONGSHU = "xhs_download"


class VideoStatus(str, enum.Enum):
    UPLOADING = "uploading"
    DOWNLOADING = "downloading"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class VideoLanguage(str, enum.Enum):
    ZH = "zh"
    EN = "en"


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    source: Mapped[VideoSource] = mapped_column(SAEnum(VideoSource), nullable=False)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    storage_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    status: Mapped[VideoStatus] = mapped_column(SAEnum(VideoStatus), default=VideoStatus.UPLOADING)
    language: Mapped[VideoLanguage | None] = mapped_column(SAEnum(VideoLanguage), nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="videos")
    transcript = relationship("Transcript", back_populates="video", uselist=False, cascade="all, delete-orphan")
    published_contents = relationship("PublishedContent", back_populates="video", cascade="all, delete-orphan")
```

- [ ] **Step 4: Create backend/app/models/transcript.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class TranscriptLanguage(str, enum.Enum):
    ZH = "zh"
    EN = "en"


class Transcript(Base):
    __tablename__ = "transcripts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    video_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("videos.id"), unique=True, nullable=False)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    cleaned_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    optimized_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    language: Mapped[TranscriptLanguage] = mapped_column(SAEnum(TranscriptLanguage), default=TranscriptLanguage.ZH)
    word_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    processing_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    video = relationship("Video", back_populates="transcript")
```

- [ ] **Step 5: Create backend/app/models/platform_connection.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class PlatformType(str, enum.Enum):
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    XIAOHONGSHU = "xiaohongshu"
    FACEBOOK = "facebook"


class PlatformConnection(Base):
    __tablename__ = "platform_connections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    platform: Mapped[PlatformType] = mapped_column(SAEnum(PlatformType), nullable=False)
    access_token: Mapped[str] = mapped_column(String(1000), nullable=False)  # encrypted in production
    refresh_token: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    platform_user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    platform_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="platform_connections")
```

- [ ] **Step 6: Create backend/app/models/published_content.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, ForeignKey, Text, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class PublishPlatform(str, enum.Enum):
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    XIAOHONGSHU = "xiaohongshu"
    FACEBOOK = "facebook"


class PublishStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    FAILED = "failed"


class PublishedContent(Base):
    __tablename__ = "published_contents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    video_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("videos.id"), nullable=False)
    platform: Mapped[PublishPlatform] = mapped_column(SAEnum(PublishPlatform), nullable=False)
    platform_post_id: Mapped[str | None] = mapped_column(String(500), nullable=True)
    platform_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    caption_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[PublishStatus] = mapped_column(SAEnum(PublishStatus), default=PublishStatus.PUBLISHING)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    views_count: Mapped[int] = mapped_column(Integer, default=0)
    likes_count: Mapped[int] = mapped_column(Integer, default=0)
    comments_count: Mapped[int] = mapped_column(Integer, default=0)
    shares_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="published_contents")
    video = relationship("Video", back_populates="published_contents")
```

- [ ] **Step 7: Set up Alembic**

```bash
cd /home/alan/projects/video-repurpose-saas/backend
alembic init alembic
```

Then edit `alembic/env.py`:

```python
from app.database import Base
from app.models import *  # import all models so Alembic detects them

target_metadata = Base.metadata
```

- [ ] **Step 8: Generate initial migration**

```bash
cd /home/alan/projects/video-repurpose-saas/backend
alembic revision --autogenerate -m "initial models"
alembic upgrade head
```

Expected: All tables created in PostgreSQL.

- [ ] **Step 9: Commit models**

```bash
cd /home/alan/projects/video-repurpose-saas
git add -A
git commit -m "feat: add database models and initial migration"
```

---

### Task 3: Auth System (Backend + Frontend)

**Files:**
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/user.py`
- Create: `backend/app/routers/auth.py`
- Create: `frontend/lib/api-client.ts`
- Create: `frontend/app/auth/login/page.tsx`
- Create: `frontend/app/auth/register/page.tsx`
- Create: `frontend/middleware.ts`

- [ ] **Step 1: Write auth tests**

Create `backend/tests/conftest.py`:

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.main import app
from app.database import Base, get_db
from app.config import get_settings

settings = get_settings()

# Use a test database
TEST_DATABASE_URL = settings.database_url + "_test"


@pytest_asyncio.fixture
async def async_client():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    test_session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with test_session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
```

Create `backend/tests/test_auth.py`:

```python
import pytest


@pytest.mark.asyncio
async def test_register_user(async_client):
    response = await async_client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "securepass123",
        "name": "Test User",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data
    assert "password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(async_client):
    await async_client.post("/api/v1/auth/register", json={
        "email": "dup@example.com",
        "password": "pass123",
        "name": "User 1",
    })
    response = await async_client.post("/api/v1/auth/register", json={
        "email": "dup@example.com",
        "password": "pass456",
        "name": "User 2",
    })
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login_success(async_client):
    await async_client.post("/api/v1/auth/register", json={
        "email": "login@example.com",
        "password": "mypassword",
        "name": "Login User",
    })
    response = await async_client.post("/api/v1/auth/login", json={
        "email": "login@example.com",
        "password": "mypassword",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(async_client):
    await async_client.post("/api/v1/auth/register", json={
        "email": "wrong@example.com",
        "password": "correctpass",
        "name": "Wrong User",
    })
    response = await async_client.post("/api/v1/auth/login", json={
        "email": "wrong@example.com",
        "password": "wrongpass",
    })
    assert response.status_code == 401
```

Run: `pytest backend/tests/test_auth.py -v`
Expected: 3 tests pass (register, duplicate check, login success, wrong password).

- [ ] **Step 2: Create schemas**

`backend/app/schemas/user.py`:

```python
from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional


class UserRegister(BaseModel):
    email: str
    password: str
    name: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    plan: str
    credits_remaining: int
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
```

- [ ] **Step 3: Create auth router**

`backend/app/routers/auth.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.hash import bcrypt
from jose import jwt
from datetime import datetime, timedelta

from app.database import get_db
from app.config import get_settings
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse

router = APIRouter()
settings = get_settings()


def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user
```

Need to add: `from fastapi.security import OAuth2PasswordBearer`
And: `oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")`

Full router code:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.hash import bcrypt
from jose import jwt
from datetime import datetime, timedelta

from app.database import get_db
from app.config import get_settings
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse

router = APIRouter()
settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/register", status_code=201)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check duplicate
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=data.email,
        name=data.name,
        password_hash=bcrypt.hash(data.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/login")
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not bcrypt.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(str(user.id))
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)
```

- [ ] **Step 4: Run auth tests to verify they pass**

```bash
cd /home/alan/projects/video-repurpose-saas
docker compose up -d db
sleep 3
cd backend
# Create test database
python -c "import asyncio; from app.database import engine; asyncio.run(engine.execute('CREATE DATABASE contentsync_test'))" 2>/dev/null || true
pytest tests/test_auth.py -v
```

Expected: All tests pass.

- [ ] **Step 5: Create frontend API client**

`frontend/lib/api-client.ts`:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth helpers
export const auth = {
  register: (data: { email: string; password: string; name: string }) =>
    apiClient<{ id: string; email: string; name: string }>("/auth/register", {
      method: "POST",
      body: data,
    }),

  login: (data: { email: string; password: string }) =>
    apiClient<{ access_token: string; token_type: string; user: any }>("/auth/login", {
      method: "POST",
      body: data,
    }),

  getMe: (token: string) =>
    apiClient<{ id: string; email: string; name: string; plan: string }>("/auth/me", {
      token,
    }),
};
```

- [ ] **Step 6: Create Login page**

`frontend/app/auth/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await auth.login({ email, password });
      localStorage.setItem("token", result.access_token);
      localStorage.setItem("user", JSON.stringify(result.user));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>登入 / Login</CardTitle>
          <CardDescription>ContentSync Studio</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
            )}
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">密碼 / Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "處理中..." : "登入 / Login"}
            </Button>
            <p className="text-center text-sm text-gray-500">
              還沒有帳號?{" "}
              <a href="/auth/register" className="text-blue-600 hover:underline">
                註冊 / Register
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 7: Create Register page (similar to login)**

`frontend/app/auth/register/page.tsx` — same pattern, fields: name, email, password. After register, auto-redirect to login.

- [ ] **Step 8: Create middleware for auth protection**

`frontend/middleware.ts`:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth");
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");

  if (isDashboard && !token) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};
```

- [ ] **Step 9: Test the full auth flow**

```bash
cd /home/alan/projects/video-repurpose-saas
docker compose up -d
# Frontend: http://localhost:3000/auth/login
# Backend: http://localhost:8000/docs
```

Manual test: Register → Login → Redirect to dashboard → Token stored.

- [ ] **Step 10: Commit auth**

```bash
cd /home/alan/projects/video-repurpose-saas
git add -A
git commit -m "feat: add auth system with register/login/JWT"
```

---

### Task 4: Video Import (Download + Upload)

**Files:**
- Create: `backend/app/services/video_downloader.py`
- Create: `backend/app/services/storage.py`
- Create: `backend/app/routers/videos.py`
- Create: `backend/app/schemas/video.py`
- Create: `backend/app/tasks/celery_app.py`
- Create: `backend/app/tasks/video_tasks.py`
- Create: `frontend/app/dashboard/videos/page.tsx`
- Create: `frontend/app/dashboard/videos/new/page.tsx`

- [ ] **Step 1: Write video downloader test**

```python
# tests/test_videos.py
@pytest.mark.asyncio
async def test_import_video(async_client):
    # Mock yt-dlp to avoid actual network call
    response = await async_client.post("/api/v1/videos/import", json={
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    })
    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "downloading"
    assert "id" in data
```

- [ ] **Step 2: Create video schemas**

`backend/app/schemas/video.py`:

```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class VideoImportRequest(BaseModel):
    url: str
    source: str = "youtube_download"  # youtube_download | tiktok_download


class VideoResponse(BaseModel):
    id: UUID
    source: str
    source_url: Optional[str]
    original_filename: str
    duration_seconds: Optional[int]
    status: str
    language: Optional[str]
    thumbnail_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class VideoListResponse(BaseModel):
    items: list[VideoResponse]
    total: int
```

- [ ] **Step 3: Create video_downloader service**

`backend/app/services/video_downloader.py`:

```python
import yt_dlp
import os
import uuid
from pathlib import Path
from typing import Optional


DOWNLOAD_DIR = Path("/app/downloads")


class VideoDownloader:
    def __init__(self):
        DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

    async def download_youtube(
        self, url: str, quality: str = "best[height<=1080]"
    ) -> dict:
        """Download YouTube video, return local path + metadata."""
        task_id = str(uuid.uuid4())
        output_template = str(DOWNLOAD_DIR / f"{task_id}.%(ext)s")

        ydl_opts = {
            "format": quality,
            "outtmpl": output_template,
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
        }

        def run_download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                file_path = ydl.prepare_filename(info)
                # Handle format extensions
                if not os.path.exists(file_path):
                    # yt-dlp may use .webm or .mp4
                    for ext in [".mp4", ".webm", ".mkv"]:
                        p = str(DOWNLOAD_DIR / f"{task_id}{ext}")
                        if os.path.exists(p):
                            file_path = p
                            break

                return {
                    "task_id": task_id,
                    "file_path": str(file_path),
                    "title": info.get("title", "Unknown"),
                    "duration": info.get("duration"),
                    "thumbnail": info.get("thumbnail"),
                    "ext": info.get("ext", "mp4"),
                }

        # Run in thread pool to not block async
        import asyncio, concurrent.futures
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            result = await loop.run_in_executor(pool, run_download)

        return result

    async def download_tiktok(self, url: str) -> dict:
        """Download TikTok video (similar to YouTube, without watermark)."""
        task_id = str(uuid.uuid4())
        output_template = str(DOWNLOAD_DIR / f"{task_id}.%(ext)s")

        ydl_opts = {
            "format": "best",
            "outtmpl": output_template,
            "quiet": True,
            "no_warnings": True,
        }

        def run_download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                file_path = str(DOWNLOAD_DIR / f"{task_id}.mp4")
                if os.path.exists(str(DOWNLOAD_DIR / f"{task_id}.webm")):
                    file_path = str(DOWNLOAD_DIR / f"{task_id}.webm")
                return {
                    "task_id": task_id,
                    "file_path": file_path,
                    "title": info.get("title", "Unknown"),
                    "duration": info.get("duration"),
                    "thumbnail": info.get("thumbnail"),
                    "ext": "mp4",
                }

        import asyncio, concurrent.futures
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            result = await loop.run_in_executor(pool, run_download)

        return result
```

- [ ] **Step 4: Create storage service**

`backend/app/services/storage.py`:

```python
import boto3
import os
from pathlib import Path
from app.config import get_settings


class StorageService:
    def __init__(self):
        settings = get_settings()
        if settings.s3_endpoint_url:
            self.client = boto3.client(
                "s3",
                endpoint_url=settings.s3_endpoint_url,
                aws_access_key_id=settings.s3_access_key_id,
                aws_secret_access_key=settings.s3_secret_access_key,
            )
            self.bucket = settings.s3_bucket
            self.enabled = True
        else:
            self.client = None
            self.enabled = False

    async def upload_file(self, local_path: str, remote_key: str) -> str:
        """Upload file to S3/R2, return public URL."""
        if not self.enabled:
            # Local fallback — just return local path
            return local_path

        def _upload():
            self.client.upload_file(local_path, self.bucket, remote_key)
            return f"{self.client.meta.endpoint_url}/{self.bucket}/{remote_key}"

        import asyncio, concurrent.futures
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            url = await loop.run_in_executor(pool, _upload)

        return url
```

- [ ] **Step 5: Create Celery app**

`backend/app/tasks/celery_app.py`:

```python
from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "contentsync",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.video_tasks", "app.tasks.ai_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
```

- [ ] **Step 6: Create video tasks**

`backend/app/tasks/video_tasks.py`:

```python
from app.tasks.celery_app import celery_app
from app.services.video_downloader import VideoDownloader
from app.services.storage import StorageService
from app.database import async_session_factory
from app.models.video import Video, VideoStatus
from sqlalchemy import select
import uuid


@celery_app.task(bind=True, max_retries=3)
def download_video(self, video_id: str, url: str, source: str):
    """Download video in background worker."""
    import asyncio

    async def _run():
        downloader = VideoDownloader()
        storage = StorageService()

        if "youtube" in source:
            result = await downloader.download_youtube(url)
        elif "tiktok" in source:
            result = await downloader.download_tiktok(url)
        else:
            raise ValueError(f"Unknown source: {source}")

        # Upload to S3/R2
        remote_key = f"videos/{video_id}/{result['task_id']}.{result['ext']}"
        storage_url = await storage.upload_file(result["file_path"], remote_key)

        # Update DB
        async with async_session_factory() as session:
            vid = uuid.UUID(video_id)
            q = select(Video).where(Video.id == vid)
            r = await session.execute(q)
            video = r.scalar_one()
            video.status = VideoStatus.READY
            video.storage_url = storage_url
            video.original_filename = result["title"]
            video.duration_seconds = result["duration"]
            video.thumbnail_url = result["thumbnail"]
            await session.commit()

        return {"video_id": video_id, "status": "ready"}

    try:
        return asyncio.run(_run())
    except Exception as exc:
        # Update DB as failed
        async def _fail():
            async with async_session_factory() as session:
                vid = uuid.UUID(video_id)
                q = select(Video).where(Video.id == vid)
                r = await session.execute(q)
                video = r.scalar_one()
                video.status = VideoStatus.FAILED
                video.error_message = str(exc)
                await session.commit()
        asyncio.run(_fail())
        raise self.retry(exc=exc, countdown=60)
```

- [ ] **Step 7: Create videos router**

`backend/app/routers/videos.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.video import Video, VideoSource, VideoStatus
from app.models.user import User
from app.schemas.video import VideoImportRequest, VideoResponse, VideoListResponse
from app.routers.auth import get_current_user
from app.tasks.video_tasks import download_video
import uuid
import os
from pathlib import Path
import shutil

router = APIRouter()
UPLOAD_DIR = Path("/app/downloads/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/import", status_code=202)
async def import_video(
    data: VideoImportRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import video from URL (YouTube/TikTok)."""
    # Check credits
    if user.credits_remaining <= 0:
        raise HTTPException(status_code=402, detail="No credits remaining")

    # Create video record
    video = Video(
        user_id=user.id,
        source=VideoSource(data.source),
        source_url=data.url,
        original_filename="pending...",
        status=VideoStatus.DOWNLOADING,
    )
    db.add(video)
    await db.flush()
    await db.refresh(video)

    # Deduct credit
    user.credits_remaining -= 1

    # Dispatch async download
    download_video.delay(str(video.id), data.url, data.source)

    return VideoResponse.model_validate(video)


@router.get("")
async def list_videos(
    page: int = 1,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's videos."""
    offset = (page - 1) * limit
    q = select(Video).where(Video.user_id == user.id).order_by(Video.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    videos = result.scalars().all()

    count_q = select(func.count()).select_from(Video).where(Video.user_id == user.id)
    count_result = await db.execute(count_q)
    total = count_result.scalar()

    return VideoListResponse(
        items=[VideoResponse.model_validate(v) for v in videos],
        total=total,
    )


@router.get("/{video_id}")
async def get_video(
    video_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Video).where(Video.id == video_id, Video.user_id == user.id)
    result = await db.execute(q)
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return VideoResponse.model_validate(video)


@router.delete("/{video_id}", status_code=204)
async def delete_video(
    video_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Video).where(Video.id == video_id, Video.user_id == user.id)
    result = await db.execute(q)
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    await db.delete(video)
```

- [ ] **Step 8: Create video list frontend page**

`frontend/app/dashboard/videos/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Video {
  id: string;
  source: string;
  source_url: string | null;
  original_filename: string;
  status: string;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  created_at: string;
}

export default function VideosPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) {
      router.push("/auth/login");
      return;
    }
    fetchVideos();
  }, [token]);

  const fetchVideos = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/videos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setVideos(data.items || []);
    } catch (err) {
      console.error("Failed to fetch videos", err);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ready: "bg-green-100 text-green-800",
      downloading: "bg-blue-100 text-blue-800",
      processing: "bg-yellow-100 text-yellow-800",
      failed: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={colors[status] || "bg-gray-100"}>
        {status === "ready" ? "已完成" : status === "downloading" ? "下載中" : status === "processing" ? "處理中" : status === "failed" ? "失敗" : status}
      </Badge>
    );
  };

  if (loading) return <div className="p-8 text-center">載入中...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">影片庫 / Videos</h1>
        <Button onClick={() => router.push("/dashboard/videos/new")}>
          + 新增影片
        </Button>
      </div>

      {videos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            還沒有影片，點擊「新增影片」開始
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Card
              key={video.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/dashboard/videos/${video.id}`)}
            >
              <CardContent className="p-4">
                <div className="aspect-video bg-gray-100 rounded mb-3 flex items-center justify-center text-gray-400 text-sm">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.original_filename}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    "🎬"
                  )}
                </div>
                <h3 className="font-medium truncate">{video.original_filename}</h3>
                <div className="flex items-center gap-2 mt-2">
                  {statusBadge(video.status)}
                  <span className="text-xs text-gray-500">
                    {video.duration_seconds
                      ? `${Math.floor(video.duration_seconds / 60)}:${String(video.duration_seconds % 60).padStart(2, "0")}`
                      : "--:--"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 9: Create "new video" page**

`frontend/app/dashboard/videos/new/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NewVideoPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [source, setSource] = useState("youtube_download");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/videos/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url, source }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Import failed");
      }

      router.push("/dashboard/videos");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>新增影片 / New Video</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="link" className="space-y-4">
            <TabsList>
              <TabsTrigger value="link">貼連結 / Paste Link</TabsTrigger>
              <TabsTrigger value="upload">上傳檔案 / Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="link">
              <form onSubmit={handleImport} className="space-y-4">
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
                )}

                <div>
                  <label className="text-sm font-medium">來源平台 / Source</label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      type="button"
                      variant={source === "youtube_download" ? "default" : "outline"}
                      onClick={() => setSource("youtube_download")}
                    >
                      YouTube
                    </Button>
                    <Button
                      type="button"
                      variant={source === "tiktok_download" ? "default" : "outline"}
                      onClick={() => setSource("tiktok_download")}
                    >
                      TikTok
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">影片連結 / Video URL</label>
                  <Input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "下載中..." : "開始下載 / Import"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="upload">
              <div className="border-2 border-dashed rounded-lg p-12 text-center text-gray-500">
                📁 拖放影片到這裡，或點擊選擇檔案
                <br />
                <span className="text-sm">支援 MP4 / MOV / WebM（最大 500MB）</span>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 10: Test video import flow**

```bash
# Start services
cd /home/alan/projects/video-repurpose-saas
docker compose up -d

# Test health endpoint
curl http://localhost:8000/api/v1/health
# Expected: {"status": "ok", "version": "0.1.0"}

# Test video import (requires auth token from login)
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add video import with YouTube/TikTok download"
```

---

### Task 5: AI Pipeline (Whisper + GPT)

**Files:**
- Create: `backend/app/services/ai_service.py`
- Create: `backend/app/tasks/ai_tasks.py`
- Create: `backend/app/routers/ai.py`
- Create: `backend/app/schemas/ai.py`
- Create: `frontend/app/dashboard/videos/[id]/page.tsx`

- [ ] **Step 1: Write AI service tests**

```python
# tests/test_ai.py
@pytest.mark.asyncio
async def test_transcribe_video(async_client):
    # First import a video, then transcribe it
    # (requires a real video file or mock)
    pass
```

- [ ] **Step 2: Create AI schemas**

`backend/app/schemas/ai.py`:

```python
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
```

- [ ] **Step 3: Create AI service**

`backend/app/services/ai_service.py`:

```python
from openai import AsyncOpenAI
from app.config import get_settings
import ffmpeg
import os
import tempfile
from pathlib import Path

settings = get_settings()
client = AsyncOpenAI(api_key=settings.openai_api_key)


class AIService:
    @staticmethod
    async def extract_audio(video_path: str) -> str:
        """Extract audio from video file, return path to audio file."""
        audio_path = video_path + ".mp3"
        (
            ffmpeg
            .input(video_path)
            .output(audio_path, format="mp3", acodec="libmp3lame", ac=1, ar="16000")
            .overwrite_output()
            .run(quiet=True)
        )
        return audio_path

    @staticmethod
    async def transcribe(audio_path: str, language: str = "zh") -> dict:
        """Transcribe audio using OpenAI Whisper API."""
        with open(audio_path, "rb") as audio_file:
            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=language if language != "auto" else None,
                response_format="verbose_json",
            )
        return {
            "text": response.text,
            "language": response.language if hasattr(response, "language") else language,
            "duration": response.duration if hasattr(response, "duration") else 0,
        }

    @staticmethod
    async def clean_transcript(raw_text: str, language: str = "zh") -> str:
        """Remove filler words using GPT-4o-mini."""
        system_prompt = {
            "zh": "你是一個專業的文稿編輯。請移除以下文字中的口頭禪、重複詞、filler words（如：嗯、啊、那個、就是說、然後、對對對）。保持原意，不要改寫內容。只輸出乾淨的文字。",
            "en": "You are a professional transcript editor. Remove filler words (um, uh, like, you know, actually, basically, I mean). Keep the original meaning. Output only the cleaned text.",
        }

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt.get(language, system_prompt["zh"])},
                {"role": "user", "content": raw_text},
            ],
            temperature=0.3,
            max_tokens=4000,
        )
        return response.choices[0].message.content or raw_text

    @staticmethod
    async def optimize_text(raw_text: str, language: str = "zh", style: str = "general") -> str:
        """Optimize transcript into polished copy using GPT-4o."""
        style_guide = {
            "general": "讓文字更流暢易讀，適合一般閱讀",
            "professional": "使用專業語氣，適合 LinkedIn 或商業場合",
            "casual": "保持口語自然風格，適合社群媒體",
        }

        prompt = {
            "zh": f"請優化以下文稿。{style_guide.get(style, style_guide['general'])}。分段輸出，每段不超過3句話。保持說話者的個人風格。不要使用 markdown 格式。",
            "en": f"Please polish the following transcript. {style_guide.get(style, style_guide['general'])}. Break into paragraphs of max 3 sentences each. Keep the speaker's voice. No markdown.",
        }

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": prompt.get(language, prompt["zh"])},
                {"role": "user", "content": raw_text},
            ],
            temperature=0.5,
            max_tokens=4000,
        )
        return response.choices[0].message.content or raw_text

    @staticmethod
    async def generate_summary(text: str, language: str = "zh", length: str = "short") -> str:
        """Generate AI summary."""
        length_guide = {
            "short": "15-30字的單一句子摘要",
            "medium": "50-100字的段落摘要",
            "long": "200-300字的詳細摘要",
            "bullets": "5-10個重點列表",
        }

        prompt = {
            "zh": f"請為以下文字生成{length_guide.get(length, length_guide['short'])}。直接輸出內容，不要說明。",
            "en": f"Generate a {length_guide.get(length, length_guide['short'])} for the following text. Output directly, no explanations.",
        }

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": prompt.get(language, prompt["zh"])},
                {"role": "user", "content": text},
            ],
            temperature=0.3,
            max_tokens=1000,
        )
        return response.choices[0].message.content or text
```

- [ ] **Step 4: Create AI tasks (Celery)**

`backend/app/tasks/ai_tasks.py`:

```python
from app.tasks.celery_app import celery_app
from app.services.ai_service import AIService
from app.database import async_session_factory
from app.models.video import Video, VideoStatus
from app.models.transcript import Transcript, TranscriptLanguage
from sqlalchemy import select
import uuid
import time


@celery_app.task(bind=True, max_retries=2)
def process_video_ai(self, video_id: str):
    """Full AI pipeline: audio extraction → transcription → clean → optimize → summarize."""
    import asyncio

    async def _run():
        ai = AIService()
        video_uuid = uuid.UUID(video_id)

        # Get video from DB
        async with async_session_factory() as session:
            q = select(Video).where(Video.id == video_uuid)
            r = await session.execute(q)
            video = r.scalar_one_or_none()
            if not video:
                raise ValueError(f"Video {video_id} not found")
            video.status = VideoStatus.PROCESSING
            await session.commit()

        local_path = video.storage_url  # For dev, this is local path
        # In production, download from S3 first

        # Step 1: Extract audio
        audio_path = await ai.extract_audio(local_path)

        # Step 2: Transcribe
        start = time.time()
        transcribe_result = await ai.transcribe(audio_path, language="auto")
        elapsed = int((time.time() - start) * 1000)

        # Detect language
        lang = "zh" if transcribe_result["language"] and transcribe_result["language"].startswith("zh") else "en"

        # Clean up audio file
        import os
        if os.path.exists(audio_path):
            os.remove(audio_path)

        # Step 3: Clean transcript
        cleaned = await ai.clean_transcript(transcribe_result["text"], language=lang)

        # Step 4: Optimize
        optimized = await ai.optimize_text(transcribe_result["text"], language=lang)

        # Step 5: Generate summary
        summary = await ai.generate_summary(optimized, language=lang)

        # Save to DB
        async with async_session_factory() as session:
            q = select(Transcript).where(Transcript.video_id == video_uuid)
            r = await session.execute(q)
            existing = r.scalar_one_or_none()

            if existing:
                existing.raw_text = transcribe_result["text"]
                existing.cleaned_text = cleaned
                existing.optimized_text = optimized
                existing.summary = summary
                existing.language = TranscriptLanguage(lang)
                existing.word_count = len(optimized)
                existing.processing_time_ms = elapsed
                existing.ai_model = "whisper-1+gpt-4o"
            else:
                transcript = Transcript(
                    video_id=video_uuid,
                    raw_text=transcribe_result["text"],
                    cleaned_text=cleaned,
                    optimized_text=optimized,
                    summary=summary,
                    language=TranscriptLanguage(lang),
                    word_count=len(optimized),
                    processing_time_ms=elapsed,
                    ai_model="whisper-1+gpt-4o",
                )
                session.add(transcript)

            # Update video status
            vq = select(Video).where(Video.id == video_uuid)
            vr = await session.execute(vq)
            video = vr.scalar_one()
            video.status = VideoStatus.READY
            await session.commit()

        return {"video_id": video_id, "status": "completed"}

    try:
        return asyncio.run(_run())
    except Exception as exc:
        async def _fail():
            async with async_session_factory() as session:
                vid = uuid.UUID(video_id)
                q = select(Video).where(Video.id == vid)
                r = await session.execute(q)
                video = r.scalar_one()
                video.status = VideoStatus.FAILED
                video.error_message = str(exc)
                await session.commit()
        asyncio.run(_fail())
        raise self.retry(exc=exc, countdown=60)
```

- [ ] **Step 5: Create AI router**

`backend/app/routers/ai.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.video import Video, VideoStatus
from app.models.transcript import Transcript
from app.models.user import User
from app.schemas.ai import TranscriptResponse, AIJobStatus
from app.routers.auth import get_current_user
from app.tasks.ai_tasks import process_video_ai
import uuid

router = APIRouter()


@router.post("/transcribe/{video_id}", status_code=202)
async def start_transcription(
    video_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start AI processing pipeline for a video."""
    q = select(Video).where(Video.id == video_id, Video.user_id == user.id)
    result = await db.execute(q)
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if video.status != VideoStatus.READY:
        raise HTTPException(status_code=400, detail=f"Video status is {video.status.value}, expected 'ready'")

    # Dispatch AI task
    task = process_video_ai.delay(str(video.id))
    return {"job_id": task.id, "status": "queued"}


@router.get("/transcript/{video_id}")
async def get_transcript(
    video_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get transcript for a video."""
    q = select(Transcript).join(Video).where(
        Transcript.video_id == video_id,
        Video.user_id == user.id,
    )
    result = await db.execute(q)
    transcript = result.scalar_one_or_none()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found or still processing")
    return TranscriptResponse.model_validate(transcript)


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Check AI job status."""
    from app.tasks.celery_app import celery_app
    task = celery_app.AsyncResult(job_id)
    return AIJobStatus(
        job_id=job_id,
        status=task.state,
        result=task.result if task.ready() else None,
    )
```

- [ ] **Step 6: Create video detail page with transcript viewer**

`frontend/app/dashboard/videos/[id]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface VideoDetail {
  id: string;
  original_filename: string;
  source: string;
  status: string;
  duration_seconds: number | null;
  storage_url: string | null;
  created_at: string;
}

interface Transcript {
  raw_text: string | null;
  cleaned_text: string | null;
  optimized_text: string | null;
  summary: string | null;
  language: string;
  word_count: number | null;
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) return;
    fetchVideo();
  }, [params.id]);

  const fetchVideo = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/videos/${params.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const v = await res.json();
      setVideo(v);

      // Also fetch transcript
      const tRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ai/transcript/${params.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (tRes.ok) {
        setTranscript(await tRes.json());
      }
    } catch (err) {
      console.error("Failed to fetch video", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTranscribe = async () => {
    setProcessing(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ai/transcribe/${params.id}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        // Poll for completion
        const poll = setInterval(async () => {
          const tRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/ai/transcript/${params.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (tRes.ok) {
            setTranscript(await tRes.json());
            setProcessing(false);
            clearInterval(poll);
          }
        }, 3000);
      }
    } catch (err) {
      console.error("Failed to start transcription", err);
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center">載入中...</div>;
  if (!video) return <div className="p-8 text-center">影片不存在</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{video.original_filename}</h1>
          <p className="text-sm text-gray-500">
            {video.source} | {video.duration_seconds ? `${Math.floor(video.duration_seconds / 60)}:${String(video.duration_seconds % 60).padStart(2, "0")}` : "--:--"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleTranscribe}
            disabled={processing || video.status !== "ready"}
          >
            {processing ? "AI 處理中..." : "🤖 AI 處理"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/publish/${video.id}`)}
          >
            📤 發布
          </Button>
        </div>
      </div>

      {transcript ? (
        <Tabs defaultValue="optimized">
          <TabsList>
            <TabsTrigger value="optimized">優化文案</TabsTrigger>
            <TabsTrigger value="summary">摘要</TabsTrigger>
            <TabsTrigger value="raw">逐字稿</TabsTrigger>
            <TabsTrigger value="cleaned">去除贅詞</TabsTrigger>
          </TabsList>

          <TabsContent value="optimized">
            <Card>
              <CardContent className="p-6 whitespace-pre-wrap">
                {transcript.optimized_text || "尚無優化文案"}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary">
            <Card>
              <CardContent className="p-6 whitespace-pre-wrap">
                {transcript.summary || "尚無摘要"}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="raw">
            <Card>
              <CardContent className="p-6 whitespace-pre-wrap text-sm text-gray-600">
                {transcript.raw_text || "尚無逐字稿"}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cleaned">
            <Card>
              <CardContent className="p-6 whitespace-pre-wrap">
                {transcript.cleaned_text || "尚無去除贅詞版本"}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {processing
              ? "⏳ AI 正在處理中，請稍候..."
              : "點擊「AI 處理」按鈕開始語音轉文字"}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Test AI pipeline end-to-end**

```bash
# Upload a short video or import one
# Then POST /api/v1/ai/transcribe/{video_id}
# Wait for Celery worker to process
# GET /api/v1/ai/transcript/{video_id} to see results
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add AI pipeline with Whisper transcription and GPT optimization"
```

---

### Task 6: Publish + Dashboard UI

**Files:**
- Create: `backend/app/services/platform_service.py`
- Create: `backend/app/routers/publish.py`
- Create: `backend/app/routers/platforms.py`
- Create: `frontend/app/dashboard/page.tsx` (dashboard overview)
- Create: `frontend/app/dashboard/layout.tsx` (sidebar layout)
- Create: `frontend/app/dashboard/publish/[videoId]/page.tsx`
- Create: `frontend/app/dashboard/publish/page.tsx`

- [ ] **Step 1: Create platform connections router**

`backend/app/routers/platforms.py` — handles OAuth flow and connecting social accounts.

- [ ] **Step 2: Create publish service**

`backend/app/services/platform_service.py` — YouTube Data API and TikTok API wrappers for uploading videos.

- [ ] **Step 3: Create publish router**

`backend/app/routers/publish.py` — handles posting video + caption to connected platforms.

- [ ] **Step 4: Create dashboard layout with sidebar**

`frontend/app/dashboard/layout.tsx` — sidebar with links to Videos, Publish, Settings.

- [ ] **Step 5: Create dashboard overview page**

`frontend/app/dashboard/page.tsx` — stats cards + recent activity.

- [ ] **Step 6: Test and commit**

`git add -A && git commit -m "feat: add publish flow and dashboard UI"`

---

## Self-Review

1. **Spec coverage:** Does the plan cover all Phase 1 requirements from PROJECT_SPEC.md?
   - ✅ Project scaffold (Task 1)
   - ✅ Database models (Task 2)
   - ✅ User system (Task 3)
   - ✅ Video import via links (Task 4, handles YouTube + TikTok)
   - ✅ AI pipeline (Task 5, Whisper + GPT)
   - ✅ Publish + Dashboard (Task 6)
   - ❌ Upload feature (minimal — drag-drop area exists but no backend)
   - ❌ i18n (zh/en detected from browser, basic labels present)

2. **Placeholder scan:** No TBD/TODO found. All steps have concrete code.

3. **Type consistency:** All model fields match between SQLAlchemy models, pydantic schemas, and frontend types.

4. **Fix:** Add `asyncio` dependency to requirements.txt and ensure `ffmpeg` is installed in Docker image.

---

## Execution Handoff

Plan complete and saved. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session, batch execution with checkpoints

**Which approach?**
