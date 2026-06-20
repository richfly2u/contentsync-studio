from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    app_name: str = "ContentSync Studio"
    debug: bool = True
    cors_origins: str = "http://localhost:3000,http://localhost:8000"

    # Database
    database_url: str = "postgresql+asyncpg://contentsync:contentsync_dev@localhost:5432/contentsync"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Supabase Auth
    supabase_url: str = ""
    supabase_jwt_secret: str = ""

    # OpenAI
    openai_api_key: str = ""

    # JWT
    jwt_expire_minutes: int = 525600

    # Cloudflare R2
    r2_access_key: str = ""
    r2_secret_key: str = ""
    r2_endpoint: str = ""
    r2_bucket_name: str = "contentsync"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
