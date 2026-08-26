from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    # App Information
    APP_NAME: str = "Enterprise Knowledge Assistant"
    APP_VERSION: str = "1.0.0"

    # AI / LLM Configuration
    OPENAI_API_KEY: str = ""
    QUERY_EMBEDDING_CACHE_SIZE: int = 256
    RAG_TOP_K: int = 5
    RAG_HISTORY_TURNS: int = 6
    RAG_MAX_OUTPUT_TOKENS: int = 4096

    # Database Configuration
    # Note: Ensure 'password' is replaced with your actual pgAdmin master password
    DATABASE_URL: str 

    # Security & JWT Authentication
    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()