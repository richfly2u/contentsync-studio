# 🎬 ContentSync Studio — 跨平台創作者內容管理 SaaS

> **版本：** v1.1（混搭版）
> **最後更新：** 2026-06-20
> **語言支援：** 繁體中文 / English
> **技術決策：** Supabase Auth + async SQLAlchemy + Celery + Docker Compose

---

## 一、專案概述

### 1.1 願景

打造一個**創作者的一站式內容中樞**，讓影片創作者（YouTube、TikTok、小紅書）可以：
1. 上傳/下載影片
2. AI 自動提取文稿、優化文案、生成摘要
3. 一鍵發布到多個社群平台
4. 管理所有內容排程與成效

### 1.2 目標用戶

| 用戶類型 | 需求 | 付費意願 |
|---------|------|---------|
| 個人創作者 | 省時間、跨平台發布 | 中（$10-15/月） |
| 小型內容團隊 | 協作、批次處理、品牌一致 | 高（$30-50/月） |
| 企業行銷部門 | 排程、分析報表、多帳號管理 | 很高（$100+/月） |

### 1.3 商業模式

| 方案 | 價格 | 功能 |
|------|------|------|
| Free | $0 | 每月 5 次處理、基本功能 |
| Pro | $12/月 | 無限次數、AI 優化、多平台發布 |
| Team | $35/月 | Pro + 協作、品牌模板、API 存取 |
| Enterprise | $100+/月 | 自訂方案、優先支援、SLA |

---

## 二、系統架構

### 2.1 整體架構圖

```
┌──────────────────────────────────────────────────────────────┐
│                    用戶瀏覽器 (Next.js 14 App Router)          │
│         Tailwind CSS + shadcn/ui + TypeScript                │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│   │ Landing     │  │ Login/Reg   │  │ Dashboard   │        │
│   └─────────────┘  └─────────────┘  └──────┬──────┘        │
│   ┌─────────────┐  ┌─────────────┐  ┌──────┴──────┐        │
│   │ Videos      │  │ AI 結果     │  │ Publish     │        │
│   └─────────────┘  └─────────────┘  └─────────────┘        │
└──────────────────────────┬───────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │  Supabase SSR Middleware │ — 保護路由
              └────────────┬────────────┘
                           │
              ┌────────────┴────────────┐
              │  前端呼叫後端 API        │
              │  (不走 Supabase DB 直連) │
              └────────────┬────────────┘
                           │ HTTPS
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                            │
│    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│    │ Auth     │  │ Videos   │  │ AI       │  │ Publish  │  │
│    │ (verify  │  │ import   │  │ transcribe│  │ YouTube  │  │
│    │  JWT)    │  │ upload   │  │ optimize  │  │ TikTok   │  │
│    └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                     ┌────────────────────┐                   │
│                     │   Services Layer   │                   │
│                     │  video / ai / pub  │                   │
│                     └─────────┬──────────┘                   │
└───────────────────────────────┼───────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Celery     │       │  PostgreSQL  │       │  Cloudflare  │
│   Worker     │◄─────►│  (pgvector)  │       │  R2 Storage  │
│ yt-dlp+ffmpeg│       │  asyncpg     │       │              │
│ Whisper+GPT  │       │              │       │  (影片存放)  │
└──────────────┘       └──────────────┘       └──────────────┘
        │                       │
        ▼                       ▼
┌──────────────┐       ┌──────────────┐
│   Redis      │       │  Supabase    │
│   (Celery    │       │  Auth        │
│    Broker)   │       │  (外部服務)   │
└──────────────┘       └──────────────┘
```

### 2.2 技術棧

| 層級 | 技術選擇 | 原因 |
|------|---------|------|
| **前端框架** | Next.js 14 (App Router) + TypeScript | SSR、SEO、RSC |
| **UI** | Tailwind CSS + shadcn/ui | 輕量、可自訂 |
| **認證** | **Supabase Auth** | 內建 OAuth (Google/Apple/Email)、session 管理、token refresh |
| **後端** | FastAPI + async SQLAlchemy | 非阻塞 I/O、AI API 呼叫高效 |
| **資料庫** | PostgreSQL 16 + pgvector | 全文檢索 + 向量搜尋 |
| **Async ORM** | SQLAlchemy 2.0 (async) + asyncpg | 非阻塞資料庫操作 |
| **佇列** | Celery + Redis | 非同步影片下載/AI 處理 |
| **儲存** | Cloudflare R2 (S3 相容) | 無出口費用、CDN |
| **AI** | OpenAI Whisper + GPT-4o / GPT-4o-mini | 語音辨識 + 文案生成 |
| **部署** | Docker Compose (開發) → Railway (生產) | 簡化 DevOps |

### 2.3 為什麼這樣組合

| 決策 | 理由 |
|------|------|
| **Supabase Auth 而非自建 JWT** | 省去密碼雜湊、token refresh、OAuth 流程、session 管理，而且內建 Google/Apple 一鍵登入 |
| **async SQLAlchemy 而非 sync** | FastAPI 是 async 框架。AI API 呼叫、ffmpeg、yt-dlp 都是 I/O 密集型，用 sync 會 blocking event loop |
| **前端呼叫後端 API 而非直連 Supabase DB** | 安全：商業邏輯（扣 credits、權限檢查）在後端執行。前端只該知道 UI 狀態 |
| **Celery 而非 BackgroundTasks** | BackgroundTasks 只在同一個 process 跑，如果 worker 重啟或 scaling 會掉任務。Celery 有持久佇列 |

---

## 三、專案目錄結構

```
contentsync/
├── .env.example
├── docker-compose.yml               # PostgreSQL + Redis + Backend + Worker + Frontend
├── .gitignore
├── README.md
│
├── backend/
│   ├── Dockerfile                    # Python + yt-dlp + ffmpeg
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/                     # 資料庫遷移
│   │   └── versions/
│   └── app/
│       ├── __init__.py
│       ├── main.py                  # FastAPI 入口
│       ├── core/
│       │   ├── __init__.py
│       │   ├── config.py            # Pydantic Settings (環境變數)
│       │   ├── database.py          # Async SQLAlchemy engine
│       │   ├── security.py          # Supabase JWT 驗證
│       │   └── celery_app.py        # Celery 實例
│       ├── models/                  # SQLAlchemy ORM
│       │   ├── __init__.py
│       │   ├── user.py
│       │   ├── video.py
│       │   ├── transcript.py
│       │   ├── platform_connection.py
│       │   └── published_content.py
│       ├── schemas/                 # Pydantic (請求/回應)
│       │   ├── __init__.py
│       │   ├── user.py
│       │   ├── video.py
│       │   ├── ai.py
│       │   └── publish.py
│       ├── api/                     # FastAPI 路由
│       │   └── v1/
│       │       ├── __init__.py
│       │       ├── router.py        # 匯總所有路由
│       │       ├── auth.py          # 用戶資料（非登入）
│       │       ├── videos.py        # 影片 CRUD
│       │       ├── ai.py            # AI 處理
│       │       ├── publish.py       # 發布
│       │       └── platforms.py     # 社群平台連結
│       ├── services/                # 業務邏輯
│       │   ├── __init__.py
│       │   ├── video_service.py     # yt-dlp 下載、ffmpeg 處理
│       │   ├── ai_service.py        # Whisper + GPT
│       │   ├── platform_service.py  # 各平台 API 封裝
│       │   └── storage.py           # R2/S3 上傳
│       ├── tasks/                   # Celery 任務
│       │   ├── __init__.py
│       │   ├── video_tasks.py       # 下載任務
│       │   └── ai_tasks.py          # AI 處理任務
│       └── utils/
│           ├── __init__.py
│           ├── youtube.py           # yt-dlp 輔助
│           └── ffmpeg.py            # ffmpeg 封裝
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── components.json              # shadcn/ui
│   ├── middleware.ts                 # Supabase SSR auth middleware
│   └── src/
│       ├── app/
│       │   ├── layout.tsx            # Root layout + Supabase Provider
│       │   ├── page.tsx              # Landing page
│       │   ├── globals.css
│       │   ├── (auth)/               # 未登入路由群組
│       │   │   ├── login/page.tsx
│       │   │   └── register/page.tsx
│       │   ├── (dashboard)/          # 登入後路由群組
│       │   │   ├── layout.tsx        # Sidebar + header
│       │   │   ├── page.tsx          # 儀表板總覽
│       │   │   ├── videos/
│       │   │   │   ├── page.tsx      # 影片列表
│       │   │   │   ├── new/page.tsx  # 新增/匯入
│       │   │   │   └── [id]/page.tsx # 影片詳情 + AI 結果
│       │   │   ├── publish/
│       │   │   │   ├── page.tsx      # 已發布列表
│       │   │   │   └── [videoId]/page.tsx  # 發布流程
│       │   │   └── settings/
│       │   │       └── page.tsx
│       │   └── auth/                 # Auth callback (Supabase redirect)
│       │       └── callback/route.ts
│       ├── components/
│       │   ├── ui/                   # shadcn/ui 元件
│       │   │   ├── button.tsx
│       │   │   ├── card.tsx
│       │   │   ├── input.tsx
│       │   │   ├── badge.tsx
│       │   │   ├── tabs.tsx
│       │   │   ├── toast.tsx
│       │   │   └── ...
│       │   └── layout/
│       │       ├── sidebar.tsx
│       │       └── header.tsx
│       ├── lib/
│       │   ├── supabase.ts           # Supabase client (browser)
│       │   ├── supabase-server.ts    # Supabase client (server)
│       │   ├── api-client.ts         # 後端 API 呼叫封裝
│       │   └── utils.ts
│       └── styles/
│           └── globals.css
│
└── docs/
    ├── PROJECT_SPEC.md               # 本文件
    └── superpowers/
        └── plans/
            └── 2026-06-20-contentsync-phase1.md
```

---

## 四、資料庫模型（Async SQLAlchemy 2.0）

### 4.1 基礎設定

```python
# backend/app/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

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

### 4.2 用戶模型（與 Supabase Auth 同步）

```python
# backend/app/models/user.py
from sqlalchemy import Column, String, Integer, DateTime, Enum, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum
import uuid


class PlanEnum(str, enum.Enum):
    free = "free"
    pro = "pro"
    team = "team"
    enterprise = "enterprise"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, default="")
    avatar_url = Column(String, default="")
    plan = Column(Enum(PlanEnum), default=PlanEnum.free, nullable=False)
    credits_remaining = Column(Integer, default=5, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

### 4.3 影片模型

```python
# backend/app/models/video.py
from sqlalchemy import Column, String, Integer, BigInteger, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum
import uuid


class VideoSource(str, enum.Enum):
    upload = "upload"
    youtube_download = "youtube_download"
    tiktok_download = "tiktok_download"
    xhs_download = "xhs_download"


class VideoStatus(str, enum.Enum):
    uploading = "uploading"
    downloading = "downloading"
    processing = "processing"
    ready = "ready"
    failed = "failed"


class Video(Base):
    __tablename__ = "videos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    source = Column(Enum(VideoSource), nullable=False)
    source_url = Column(String)
    storage_url = Column(String)              # R2 路徑
    original_filename = Column(String, default="未知影片")
    duration_seconds = Column(Integer)
    file_size_bytes = Column(BigInteger)
    status = Column(Enum(VideoStatus), default=VideoStatus.downloading, nullable=False)
    language = Column(String(2))              # 'zh' or 'en'
    thumbnail_url = Column(String)
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

### 4.4 逐字稿模型

```python
# backend/app/models/transcript.py
from sqlalchemy import Column, String, Integer, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import enum
import uuid


class TranscriptLanguage(str, enum.Enum):
    zh = "zh"
    en = "en"


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    video_id = Column(UUID(as_uuid=True), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, unique=True)
    raw_text = Column(Text)                     # 原始逐字稿
    cleaned_text = Column(Text)                 # 去除 filler words
    optimized_text = Column(Text)               # AI 優化版
    summary = Column(Text)                      # AI 摘要
    language = Column(Enum(TranscriptLanguage), default=TranscriptLanguage.zh)
    word_count = Column(Integer)
    processing_time_ms = Column(Integer)
    ai_model = Column(String, default="whisper-1+gpt-4o")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

---

## 五、認證系統（Supabase Auth）

### 5.1 架構示意

```
┌──────────┐      ┌──────────────┐      ┌────────────┐
│ 前端      │ ──→  │ Supabase     │ ──→  │ 後端       │
│ login.tsx │      │ Auth         │      │ FastAPI    │
│           │ ←──  │ (JWT token)  │ ←──  │ verify JWT │
└──────────┘      └──────────────┘      └────────────┘
                                               │
                                               ▼
                                        ┌────────────┐
                                        │ PostgreSQL  │
                                        │ users 表    │
                                        │ (同步資料)   │
                                        └────────────┘
```

### 5.2 流程

1. 用戶在前端用 Supabase Auth 登入（Email/Google/Apple）
2. Supabase 回傳 JWT token
3. 前端把 token 存在 Supabase session（自動處理 refresh）
4. 前端呼叫後端 API 時帶上 token（`Authorization: Bearer <token>`）
5. 後端用 Supabase 的公開金鑰驗證 JWT → 取出 user_id
6. 後端查詢本地 PostgreSQL `users` 表，取得方案/額度等資訊

### 5.3 後端 JWT 驗證

```python
# backend/app/core/security.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """驗證 Supabase JWT，回傳本地 User 物件。"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials
    try:
        # 驗證 JWT (使用 Supabase 的 anon key 作為 HMAC secret)
        # 生產環境建議用 JWKS 端點驗證
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        supabase_user_id = payload.get("sub")
        if not supabase_user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no sub")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    # 從本地 DB 找或建立 User
    result = await db.execute(select(User).where(User.id == supabase_user_id))
    user = result.scalar_one_or_none()

    if not user:
        # 第一次登入：從 Supabase 同步用戶資料
        user = User(
            id=supabase_user_id,
            email=payload.get("email", ""),
            name=payload.get("user_metadata", {}).get("full_name", ""),
            avatar_url=payload.get("user_metadata", {}).get("avatar_url", ""),
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    return user
```

### 5.4 前端 Supabase 客戶端

```typescript
// frontend/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 5.5 前端登入頁面

```tsx
// frontend/src/app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email 或密碼錯誤'
        : error.message)
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>登入 ContentSync Studio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
          >
            Google 登入
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-50 px-2 text-gray-500">或使用 Email</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '登入中...' : '登入'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            還沒有帳號？
            <a href="/register" className="text-blue-600 hover:underline ml-1">
              註冊
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 5.6 Supabase SSR Middleware

```typescript
// frontend/middleware.ts
import { createMiddlewareClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const protectedPaths = ['/dashboard', '/videos', '/publish', '/settings']
  const isProtected = protectedPaths.some(path =>
    req.nextUrl.pathname.startsWith(path)
  )

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if ((req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/register') && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/videos/:path*', '/publish/:path*', '/login', '/register'],
}
```

---

## 六、API 路由設計（api/v1/ 結構）

### 6.1 主路由匯總

```python
# backend/app/api/v1/router.py
from fastapi import APIRouter
from app.api.v1 import auth, videos, ai, publish, platforms

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(videos.router, prefix="/videos", tags=["videos"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(publish.router, prefix="/publish", tags=["publish"])
api_router.include_router(platforms.router, prefix="/platforms", tags=["platforms"])
```

### 6.2 FastAPI 入口

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from app.core.database import engine, Base

app = FastAPI(title=settings.app_name, version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由
app.include_router(api_router)


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
```

### 6.3 完整路由表

```
GET    /health                         — 健康檢查

# Auth（用戶資料）
GET    /api/v1/auth/me                 — 取得當前用戶資料

# 影片
POST   /api/v1/videos/import           — 貼連結下載
POST   /api/v1/videos/upload           — 上傳檔案
GET    /api/v1/videos                  — 影片列表
GET    /api/v1/videos/:id              — 影片詳情
DELETE /api/v1/videos/:id              — 刪除影片

# AI
POST   /api/v1/ai/transcribe/:video_id — 啟動 AI 處理
GET    /api/v1/ai/transcript/:video_id — 取得逐字稿
GET    /api/v1/ai/jobs/:job_id         — 查詢處理狀態

# 發布
POST   /api/v1/publish/:video_id       — 發布影片
GET    /api/v1/publish                 — 已發布列表
GET    /api/v1/publish/:id             — 發布詳情

# 平台連結
GET    /api/v1/platforms               — 列出已連結平台
POST   /api/v1/platforms/:platform/connect   — 連結
POST   /api/v1/platforms/:platform/disconnect — 斷開
```

---

## 七、影片導入服務（yt-dlp + Celery）

### 7.1 影片匯入 API

```python
# backend/app/api/v1/videos.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.video import Video, VideoSource, VideoStatus
from app.models.user import User
from app.schemas.video import VideoImportRequest, VideoResponse, VideoListResponse
from app.core.security import get_current_user
from app.tasks.video_tasks import download_video
import uuid, aiofiles, os
from pathlib import Path

router = APIRouter()
UPLOAD_DIR = Path("/tmp/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/import", status_code=202)
async def import_video(
    data: VideoImportRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """從 YouTube/TikTok 連結匯入影片。"""
    if user.credits_remaining <= 0:
        raise HTTPException(status_code=402, detail="No credits remaining")

    video = Video(
        user_id=user.id,
        source=VideoSource(data.source),
        source_url=str(data.url),
        original_filename="下載中...",
        status=VideoStatus.downloading,
    )
    db.add(video)
    await db.flush()
    await db.refresh(video)

    user.credits_remaining -= 1

    # 發送 Celery 任務
    download_video.delay(str(video.id), str(data.url), data.source, data.quality)

    return VideoResponse.model_validate(video)


@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """直接上傳影片檔案。"""
    if user.credits_remaining <= 0:
        raise HTTPException(status_code=402, detail="No credits remaining")

    # 儲存檔案到暫存
    file_path = UPLOAD_DIR / f"{uuid.uuid4()}_{file.filename}"
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    video = Video(
        user_id=user.id,
        source=VideoSource.upload,
        original_filename=file.filename or "上傳影片",
        file_size_bytes=len(content),
        status=VideoStatus.ready,
    )
    db.add(video)
    await db.flush()
    await db.refresh(video)

    user.credits_remaining -= 1

    return VideoResponse.model_validate(video)
```

### 7.2 Celery 影片下載任務

```python
# backend/app/tasks/video_tasks.py
from app.tasks.celery_app import celery_app
from app.services.video_service import VideoService
from app.services.storage import StorageService
from app.core.database import async_session_factory
from app.models.video import Video, VideoStatus
from sqlalchemy import select
import uuid, os


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def download_video(self, video_id: str, url: str, source: str, quality: str = "1080p"):
    """背景下載影片，上傳 R2，更新資料庫。"""
    import asyncio

    async def _run():
        service = VideoService()
        storage = StorageService()

        # 下載影片到暫存
        result = await service.download(url, source, quality)

        # 上傳到 R2
        remote_key = f"videos/{video_id}/original.{result['ext']}"
        storage_url = await storage.upload_file(result["file_path"], remote_key)

        # 更新 DB
        async with async_session_factory() as session:
            q = select(Video).where(Video.id == uuid.UUID(video_id))
            r = await session.execute(q)
            video = r.scalar_one()
            video.status = VideoStatus.ready
            video.storage_url = storage_url
            video.original_filename = result["title"]
            video.duration_seconds = result["duration"]
            video.thumbnail_url = result["thumbnail"]
            video.file_size_bytes = os.path.getsize(result["file_path"])
            await session.commit()

        # 清理暫存
        os.remove(result["file_path"])

        return {"video_id": video_id, "status": "ready"}

    try:
        return asyncio.run(_run())
    except Exception as exc:
        async def _fail():
            async with async_session_factory() as session:
                q = select(Video).where(Video.id == uuid.UUID(video_id))
                r = await session.execute(q)
                video = r.scalar_one()
                video.status = VideoStatus.failed
                video.error_message = str(exc)
                await session.commit()
        asyncio.run(_fail())
        raise self.retry(exc=exc)
```

### 7.3 VideoService（yt-dlp 封裝）

```python
# backend/app/services/video_service.py
import yt_dlp
import asyncio
import concurrent.futures
import os, uuid
from pathlib import Path

DOWNLOAD_DIR = Path("/tmp/youtube-downloads")
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)


class VideoService:
    async def download(self, url: str, source: str, quality: str = "1080p") -> dict:
        if "youtube" in source.lower():
            return await self._download_youtube(url, quality)
        elif "tiktok" in source.lower():
            return await self._download_tiktok(url)
        else:
            raise ValueError(f"Unsupported source: {source}")

    async def _download_youtube(self, url: str, quality: str) -> dict:
        task_id = str(uuid.uuid4())

        # 畫質對應
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
                # 找出實際下載的檔案
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
        # 與 YouTube 類似，使用 yt-dlp 下載 TikTok
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
```

---

## 八、AI 處理管線

### 8.1 Celery AI 任務

```python
# backend/app/tasks/ai_tasks.py
@celery_app.task(bind=True, max_retries=2, default_retry_delay=120)
def process_video_ai(self, video_id: str):
    """完整 AI 管線：音軌→轉文字→去除贅詞→優化→摘要"""
    import asyncio
    asyncio.run(_process_ai(video_id))
```

完整流程：
1. 從 R2 下載影片到暫存
2. ffmpeg 提取音軌（16kHz MP3）
3. OpenAI Whisper API 轉文字（自動偵測中/英文）
4. GPT-4o-mini 去除 filler words
5. GPT-4o 文案優化
6. GPT-4o 摘要生成
7. 存入 transcripts 表，更新 video status

### 8.2 AI 服務

```python
# backend/app/services/ai_service.py
from openai import AsyncOpenAI
import ffmpeg
import os

client = AsyncOpenAI()


class AIService:
    @staticmethod
    async def extract_audio(video_path: str) -> str:
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
    async def transcribe(audio_path: str) -> dict:
        with open(audio_path, "rb") as f:
            resp = await client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                response_format="verbose_json",
            )
        return {
            "text": resp.text,
            "language": resp.language if hasattr(resp, "language") else "zh",
            "duration": resp.duration if hasattr(resp, "duration") else 0,
        }

    @staticmethod
    async def clean_transcript(text: str, lang: str = "zh") -> str:
        prompt_zh = "移除口頭禪、重複詞、filler words（嗯、啊、那個、就是說）。保持原意。只輸出乾淨文字。"
        prompt_en = "Remove filler words (um, uh, like, you know). Keep original meaning. Output cleaned text only."
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompt_zh if lang == "zh" else prompt_en},
                {"role": "user", "content": text},
            ],
            temperature=0.3,
            max_tokens=4000,
        )
        return resp.choices[0].message.content or text

    @staticmethod
    async def optimize_text(text: str, lang: str = "zh") -> str:
        prompt_zh = "請優化文稿：讓文字更流暢易讀，分段輸出（每段≤3句），保持個人風格，不用 markdown。"
        prompt_en = "Polish the transcript: make it fluent and readable, break into paragraphs (≤3 sentences each), keep speaker's voice, no markdown."
        resp = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": prompt_zh if lang == "zh" else prompt_en},
                {"role": "user", "content": text},
            ],
            temperature=0.5,
            max_tokens=4000,
        )
        return resp.choices[0].message.content or text

    @staticmethod
    async def generate_summary(text: str, lang: str = "zh", length: str = "short") -> str:
        length_map = {
            "short": "15-30字的一句話摘要",
            "medium": "50-100字的段落摘要",
            "bullets": "5-10個重點列表",
        }
        prompt_zh = f"為以下文字生成{length_map.get(length, length_map['short'])}。直接輸出。"
        prompt_en = f"Generate a {length_map.get(length, length_map['short'])}. Output directly."
        resp = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": prompt_zh if lang == "zh" else prompt_en},
                {"role": "user", "content": text},
            ],
            temperature=0.3,
            max_tokens=1000,
        )
        return resp.choices[0].message.content or text
```

---

## 九、Docker Compose（開發環境）

```yaml
# docker-compose.yml
version: "3.8"

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: contentsync
      POSTGRES_PASSWORD: contentsync_dev
      POSTGRES_DB: contentsync
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
      DATABASE_URL: postgresql+asyncpg://contentsync:contentsync_dev@postgres:5432/contentsync
      REDIS_URL: redis://redis:6379/0
    volumes:
      - ./backend:/app
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  worker:
    build: ./backend
    env_file: .env
    environment:
      DATABASE_URL: postgresql+asyncpg://contentsync:contentsync_dev@postgres:5432/contentsync
      REDIS_URL: redis://redis:6379/0
    volumes:
      - ./backend:/app
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: celery -A app.core.celery_app worker --loglevel=info --concurrency=2

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      NEXT_PUBLIC_API_URL: http://backend:8000/api/v1
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

volumes:
  pgdata:
```

### Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    ffmpeg \
    yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

---

## 十、開發階段規劃

### Phase 1：MVP（6-8 週）

| 週次 | 任務 | 關鍵實作 |
|------|------|---------|
| 1 | Docker + 專案初始化 | docker-compose.yml、Dockerfile、FastAPI + Next.js scaffold |
| 2 | 資料庫 + Model | async SQLAlchemy、所有 ORM model、Alembic migration |
| 3 | 認證系統 | Supabase Auth 串接、前後端登入流程、middleware 保護路由 |
| 4 | 影片導入 | yt-dlp 下載、檔案上傳、R2 儲存、Celery worker |
| 5-6 | AI 管線 | Whisper→GPT-4o 完整流程、進度輪詢、前端顯示結果 |
| 7-8 | 發布 + 儀表板 | YouTube/TikTok 發布、基本儀表板統計、UI 整合 |

### Phase 2：擴充（4-6 週）

| 週次 | 任務 |
|------|------|
| 9-10 | 小紅書下載 + 發布 |
| 11 | Facebook + Reels |
| 12 | 排程系統 + 日曆視圖 |
| 13-14 | Brand Kit + 比例裁切 + 分析報表 |

### Phase 3：商業化（4 週）

| 週次 | 任務 |
|------|------|
| 15 | Stripe 付費系統 |
| 16 | 團隊協作 + 權限管理 |
| 17-18 | 效能優化 + Beta 測試 |

---

## 十一、測試策略

### 後端測試（pytest + pytest-asyncio）

```python
# backend/tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings

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

**測試案例涵蓋：**
- Auth: JWT 驗證、用戶同步、權限檢查
- Videos: 匯入、列表、刪除、權限隔離
- AI: 轉文字啟動、狀態查詢、結果讀取
- Publish: 發布請求、歷史查詢

---

## 十二、競爭優勢總結

| 項目 | ContentSync | OpusClip | Quso.ai | Descript | Repurpose.io |
|------|------------|----------|---------|----------|-------------|
| 影片下載 | ✅ | ❌ | ❌ | ❌ | ❌ |
| AI 文稿 | ✅ | ❌ | ❌ | ✅ | ❌ |
| 文案優化 | ✅ | ❌ | ❌ | ✅ 部分 | ❌ |
| AI 摘要 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 短影片剪輯 | ✅ (Phase 2) | ✅ | ✅ | ✅ | ❌ |
| 跨平台發布 | ✅ | ❌ | ✅ | ❌ | ✅ |
| 小紅書支援 | ✅ **獨家** | ❌ | ❌ | ❌ | ❌ |
| 繁體中文 | ✅ **獨家** | ❌ | ❌ | ✅ 部分 | ❌ |
| 價格 ($/月) | $12 | $19 | $23 | $24 | $29 |

---

## 十三、給另一個 AI 的啟動指令

如果你要交給另一個 AI（如 Claude Code、Codex、Cursor）來開發：

```
你正在開發 ContentSync Studio — 跨平台創作者內容管理 SaaS。

請讀取 docs/PROJECT_SPEC.md 了解完整規格。

技術棧：
- 前端：Next.js 14 (App Router) + Tailwind CSS + shadcn/ui + TypeScript
- 後端：FastAPI + async SQLAlchemy 2.0 + Celery + PostgreSQL 16
- 認證：Supabase Auth（非自建 JWT）
- 儲存：Cloudflare R2 (S3 相容)
- AI：OpenAI Whisper + GPT-4o / GPT-4o-mini

重要規則：
1. 前端呼叫後端 API，不直連 Supabase DB
2. 後端使用 async SQLAlchemy（非 sync）
3. 所有 UI 支援中/英文切換
4. 先寫測試，再寫功能（pytest + pytest-asyncio）
5. commit message 用英文
6. yt-dlp + ffmpeg 裝在 worker 容器，不在 backend 容器
```

---

*本文件為 v1.1 混搭版，整合 Supabase Auth（對方方案）與 async SQLAlchemy + 完整測試（Hermes 方案）。*
