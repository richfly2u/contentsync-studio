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
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
