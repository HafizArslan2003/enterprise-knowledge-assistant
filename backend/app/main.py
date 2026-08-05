from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.app.api.health import router as health_router
from backend.app.core.config import settings
from backend.app.database.database import create_tables
from backend.app.api.auth import router as auth_router
from backend.app.api import auth, chat

from backend.app.api import auth, chat, documents
@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# Include Routers
app.include_router(health_router)


@app.get("/")
def root():
    return {
        "status": "running",
        "message": "Enterprise Knowledge Assistant API",
    }
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])