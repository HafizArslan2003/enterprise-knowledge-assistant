"""
One-time script: drops all tables and recreates them with the current
model definitions (including the new User.role column).

Run this ONCE from your project root, e.g.:
    python -m backend.reset_db

Then delete this file — it's not meant to be part of the app.
"""

from backend.app.database.database import engine
from backend.app.database.base import Base

# Import every model module so Base.metadata is aware of all tables
# before we drop/create. If you skip an import, that table won't be
# touched.
from backend.app.models import user       # noqa: F401
from backend.app.models import document   # noqa: F401
from backend.app.models import chat       # noqa: F401

print("Dropping all tables...")
Base.metadata.drop_all(bind=engine)

print("Creating all tables with current schema...")
Base.metadata.create_all(bind=engine)

print("✅ Done. Database is now empty and matches your current models.")