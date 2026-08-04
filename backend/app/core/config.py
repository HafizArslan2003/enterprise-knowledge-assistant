from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Enterprise Knowledge Assistant"
    APP_VERSION: str = "1.0.0"

    OPENAI_API_KEY: str = ""

    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/eka"

    SECRET_KEY: str = "change-this-in-production"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()