from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    REDIS_URL: str = "redis://localhost:6379"
    OVERRUN_LIMIT_MINUTES: int = 15
    EARLY_CLEARANCE_LIMIT_MINUTES: int = 20

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
