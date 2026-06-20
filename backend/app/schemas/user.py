from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    avatar_url: str
    plan: str
    credits_remaining: int
    created_at: datetime

    class Config:
        from_attributes = True
