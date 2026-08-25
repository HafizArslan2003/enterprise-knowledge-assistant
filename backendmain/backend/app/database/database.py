from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from backend.app.core.config import settings
from backend.app.database.base import Base

engine = create_engine(
    settings.DATABASE_URL
    # Removed connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

def create_tables():
    Base.metadata.create_all(bind=engine)
    # Keep user-scoped retrieval fast as the number of uploaded chunks grows.
    # HNSW requires a recent pgvector version, so an older local installation
    # continues to work with the normal cosine-distance query.
    with engine.begin() as connection:
        connection.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_gemini_api_key VARCHAR"
        ))
        connection.execute(text(
            "CREATE INDEX IF NOT EXISTS documents_uploaded_by_idx "
            "ON documents (uploaded_by)"
        ))
        try:
            with connection.begin_nested():
                connection.execute(text(
                    "CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx "
                    "ON document_chunks USING hnsw (embedding vector_cosine_ops) "
                    "WITH (m = 16, ef_construction = 64)"
                ))
        except SQLAlchemyError:
            # pgvector versions before HNSW support still serve correct results.
            pass
