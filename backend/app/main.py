from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.app.api.health import router as health_router
from backend.app.core.config import settings
from backend.app.database.database import create_tables


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