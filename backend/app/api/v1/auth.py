from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter()


@router.get("/me")
async def get_me(
    user: User = Depends(get_current_user),
) -> UserResponse:
    """回傳當前登入用戶的資料。"""
    return UserResponse.model_validate(user)
