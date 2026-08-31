from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    # App Information
    APP_NAME: str = "Enterprise Knowledge Assistant"
    APP_VERSION: str = "1.0.0"

    # AI / LLM Configuration
    OPENAI_API_KEY: str = ""
    QUERY_EMBEDDING_CACHE_SIZE: int = 256
    RAG_TOP_K: int = 6                # 6 chunks — needed for multi-section queries (projects+risks+leads)
    RAG_HISTORY_TURNS: int = 4        # Keep last 4 turns of history only
    RAG_MAX_OUTPUT_TOKENS: int = 1500 # 1500 — allows full markdown tables without mid-row cutoff
                                      # Token budget: 6×800 chars input (~1200 tokens) + 1500 output
                                      # = ~2700 total — safely under Groq free 8000 TPM

    # Database Configuration
    # Note: Ensure 'password' is replaced with your actual pgAdmin master password
    DATABASE_URL: str 

    # Security & JWT Authentication
    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Slack Integration (optional — leave blank to disable)
    SLACK_BOT_TOKEN: str = ""
    SLACK_APP_TOKEN: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()