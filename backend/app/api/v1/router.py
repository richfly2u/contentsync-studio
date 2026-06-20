from fastapi import APIRouter
from app.api.v1 import auth, videos, ai

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(videos.router, prefix="/videos", tags=["videos"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])


@api_router.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
