
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.core.security import get_password_hash
from backend.app.models.user import User

engine = create_engine('postgresql://postgres:password@localhost:5432/eka')
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

admin_username = 'Admin'
admin_password = 'admin123'

existing_admin = db.query(User).filter(User.username == admin_username).first()
if not existing_admin:
    hashed_password = get_password_hash(admin_password)
    new_admin = User(username=admin_username, email='admin@example.com', hashed_password=hashed_password, role='admin')
    db.add(new_admin)
    db.commit()
    print('Admin user created.')
else:
    print('Admin user already exists.')
    if existing_admin.role != 'admin':
        existing_admin.role = 'admin'
        db.commit()
        print('Updated to admin role.')

db.close()

