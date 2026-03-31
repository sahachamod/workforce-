from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from common.config import settings
from common.database import engine
from common.schemas import HealthResponse
from common.utils import setup_logging
from app.routes import router as project_router

SERVICE_NAME = "project-service"
LOG_FILE = "logs/project-service.log"
os.makedirs("logs", exist_ok=True)
os.makedirs("uploads", exist_ok=True)

logger = setup_logging(SERVICE_NAME, LOG_FILE)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {SERVICE_NAME}...")
    yield
    logger.info(f"Shutting down {SERVICE_NAME}...")
    await engine.dispose()


app = FastAPI(
    title="Project Management Service",
    description="Project, Task and Time Tracking Management",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    return HealthResponse(status="healthy", service=SERVICE_NAME, version="1.0.0")


@app.get("/ready", tags=["Health"])
async def readiness_check():
    try:
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return JSONResponse(status_code=503, content={"status": "not ready", "error": str(e)})


app.include_router(project_router)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=settings.DEBUG)
