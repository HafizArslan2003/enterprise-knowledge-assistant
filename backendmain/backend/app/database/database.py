from sqlalchemy import create_engine
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