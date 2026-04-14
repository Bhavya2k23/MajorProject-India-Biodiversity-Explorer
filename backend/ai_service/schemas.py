from pydantic import BaseModel, Field
from typing import List


class PredictionTopResult(BaseModel):
    label: str = Field(..., description="Species name")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0 and 1")


class PredictionResponse(BaseModel):
    predictedSpecies: str = Field(..., description="Most likely predicted species")
    confidenceScore: float = Field(..., ge=0.0, le=1.0, description="Confidence score of top prediction")
    top3Predictions: List[PredictionTopResult] = Field(
        ..., description="Top 3 species predictions with confidence scores"
    )


class HealthResponse(BaseModel):
    status: str
    modelLoaded: bool
    modelName: str
    version: str
