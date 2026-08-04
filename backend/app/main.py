from fastapi import FastAPI
from backend.app.api.health import router as health_router

app = FastAPI(
    title="Enterprise Knowledge Assistant",
    description="Enterprise AI Knowledge Assistant API",
    version="1.0.0",
)

# Include Routers
app.include_router(health_router)


@app.get("/")
def root():
    return {
        "status": "running",
        "message": "Enterprise Knowledge Assistant API"
    }