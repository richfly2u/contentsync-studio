from fastapi import APIRouter
from app.api.v1 import auth

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])


@api_router.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
