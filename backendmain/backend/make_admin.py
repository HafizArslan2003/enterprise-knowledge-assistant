"""
One-time script: promotes a user to admin role by username.

Edit TARGET_USERNAME below, then run:
    python -m backend.make_admin

Then delete this file.
"""

from backend.app.database.database import SessionLocal
from backend.app.models.user import User

TARGET_USERNAME = "Admin"   # <-- change this

db = SessionLocal()
try:
    u = db.query(User).filter(User.username == TARGET_USERNAME).first()
    if not u:
        print(f"❌ No user found with username '{TARGET_USERNAME}'")
    else:
        u.role = "admin"
        db.commit()
        print(f"✅ {u.username} is now role='admin'")
finally:
    db.close()