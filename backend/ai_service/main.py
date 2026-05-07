import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from model import get_classifier, TENSORFLOW_AVAILABLE
from routes.predict import router as predict_router

# ─── Logging ────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("ai_service")


# ─── Lifespan (startup / shutdown) ─────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model once at startup, log status."""
    logger.info("=" * 55)
    logger.info("  India Biodiversity AI Service — Starting up")
    logger.info("=" * 55)

    if TENSORFLOW_AVAILABLE:
        logger.info("  ✓ TensorFlow detected — ML inference enabled")
        cls = get_classifier()
        logger.info(f"  ✓ Model loaded: {cls.model_name}")
    else:
        logger.warning("  ✗ TensorFlow NOT available — using fallback classifier")

    logger.info(f"  ✓ AI service ready on http://0.0.0.0:8000")
    logger.info("=" * 55)

    yield  # Application runs here

    logger.info("  AI Service shutting down — goodbye!")


# ─── FastAPI app ───────────────────────────────────────────────
app = FastAPI(
    title="India Biodiversity AI Service",
    description="AI-powered species image recognition microservice using MobileNetV2",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ──────────────────────────────────────────────────────
# Allow the Node.js backend and React dev server to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routes ────────────────────────────────────────────────────
app.include_router(predict_router, tags=["Species Recognition"])


# ─── Root ──────────────────────────────────────────────────────
@app.get("/", response_class=JSONResponse)
async def root():
    return {
        "service": "India Biodiversity AI Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/predict/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
