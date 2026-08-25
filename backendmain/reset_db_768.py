import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.app.database.database import engine, create_tables
from backend.app.database.base import Base

# Import all models to ensure they are registered with Base
from backend.app.models.user import User
from backend.app.models.chat import ChatSession, ChatMessage
from backend.app.models.document import Document, DocumentChunk

def reset_database():
    print("Dropping all existing tables in the database...")
    Base.metadata.drop_all(bind=engine)
    print("All tables dropped successfully.")
    
    print("Recreating tables and applying pgvector indices for 768 dimensions...")
    create_tables()
    print("Database schema successfully recreated!")

if __name__ == "__main__":
    reset_database()
