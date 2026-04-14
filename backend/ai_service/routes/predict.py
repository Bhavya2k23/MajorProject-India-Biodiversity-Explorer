import os
import io
import logging
from datetime import datetime

from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse
from PIL import Image

from schemas import PredictionResponse, HealthResponse
from model import get_classifier, TENSORFLOW_AVAILABLE

router = APIRouter()
logger = logging.getLogger("ai_service.predict")


# ─── Validation constants ────────────────────────────────────────
MAX_FILE_SIZE = 5 * 1024 * 1024   # 5 MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}


def validate_image(file_bytes: bytes) -> Image.Image:
    """Validate file type, size, and open as PIL Image."""
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Image too large. Max size is {MAX_FILE_SIZE // (1024*1024)}MB."
        )

    try:
        image = Image.open(io.BytesIO(file_bytes))
        image.verify()
        # Re-open after verify (verify() closes the file)
        image = Image.open(io.BytesIO(file_bytes))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    return image


@router.post("/predict", response_model=PredictionResponse)
async def predict_species(request: Request):
    """
    Accept an image file and return species recognition predictions.

    - **file**: JPEG, PNG, or WebP image (max 5MB)
    - Returns top-3 species predictions with confidence scores
    """
    start_time = datetime.utcnow()
    content_type = request.headers.get("content-type", "")

    # Parse multipart manually for reliability with Starlette 1.0
    try:
        form = await request.form()
        file_field = form.get("image")
        if not file_field:
            raise HTTPException(
                status_code=400,
                detail="No 'image' field in multipart form."
            )

        # Read file bytes
        file_bytes = await file_field.read()
    except Exception as e:
        logger.error(f"Form parsing failed: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to parse multipart: {str(e)}")

    # ── Validate content type ────────────────────────────────────
    file_content_type = getattr(file_field, "content_type", None) or ""
    if file_content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{file_content_type}'. Upload JPEG, PNG, or WebP."
        )

    # ── Validate image ────────────────────────────────────────────
    try:
        image = validate_image(file_bytes)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image validation failed: {e}")
        raise HTTPException(status_code=400, detail=f"Image validation failed: {str(e)}")

    # ── Run inference ─────────────────────────────────────────────
    try:
        classifier = get_classifier()
        result = classifier.predict(image)
    except Exception as e:
        logger.error(f"Inference failed: {e}")
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

    elapsed_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
    filename = getattr(file_field, "filename", "unknown")
    logger.info(
        f"[{elapsed_ms}ms] Predicted: {result['predictedSpecies']} "
        f"({result['confidenceScore']:.2%}) | File: {filename}"
    )

    return result


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Return service health status including model info."""
    classifier = get_classifier()
    return HealthResponse(
        status="healthy",
        modelLoaded=classifier.model is not None,
        modelName=classifier.model_name,
        version="1.0.0"
    )
