import asyncio
import concurrent.futures
from app.core.config import settings


class StorageService:
    def __init__(self):
        self.enabled = False
        self.client = None
        self.bucket = settings.r2_bucket_name

        if settings.r2_access_key and settings.r2_endpoint:
            import boto3

            self.client = boto3.client(
                "s3",
                endpoint_url=settings.r2_endpoint,
                aws_access_key_id=settings.r2_access_key,
                aws_secret_access_key=settings.r2_secret_key,
            )
            self.enabled = True

    async def upload_file(self, local_path: str, remote_key: str) -> str:
        """Upload file to R2/S3, return URL."""
        if not self.enabled:
            return local_path

        def _upload():
            self.client.upload_file(local_path, self.bucket, remote_key)
            return f"{settings.r2_endpoint}/{self.bucket}/{remote_key}"

        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return await loop.run_in_executor(pool, _upload)
