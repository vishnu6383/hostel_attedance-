import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    AI_SERVICE_API_KEY: str = os.getenv("AI_SERVICE_API_KEY", "super_secret_ai_api_key_2026")
    FACE_MODEL: str = os.getenv("FACE_MODEL", "ArcFace")
    FACE_DETECTOR: str = os.getenv("FACE_DETECTOR", "retinaface")
    FACE_DISTANCE_METRIC: str = os.getenv("FACE_DISTANCE_METRIC", "cosine")
    FACE_THRESHOLD: float = float(os.getenv("FACE_THRESHOLD", "0.68"))
    ANTI_SPOOFING_ENABLED: bool = os.getenv("ANTI_SPOOFING_ENABLED", "true").lower() == "true"
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))

    class Config:
        env_file = ".env"

settings = Settings()
