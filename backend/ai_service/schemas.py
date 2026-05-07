from pydantic import BaseModel, Field
from typing import List


class PredictionTopResult(BaseModel):
    label: str = Field(..., description="Species name")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0 and 1")
    isIndianSpecies: bool = Field(default=True, description="Whether the species is found in India")


class PredictionResponse(BaseModel):
    predictedSpecies: str = Field(..., description="Most likely predicted species")
    confidenceScore: float = Field(..., ge=0.0, le=1.0, description="Confidence score of top prediction")
    top3Predictions: List[PredictionTopResult] = Field(
        ..., description="Top 3 species predictions with confidence scores"
    )
    predictionsAboveThreshold: int = Field(
        default=0, description="How many predictions meet the confidence threshold"
    )
    confidenceThreshold: float = Field(
        default=0.6, ge=0.0, le=1.0, description="Minimum confidence threshold used"
    )
    isIndianSpecies: bool = Field(
        default=True, description="Whether the top prediction is an Indian species"
    )


class HealthResponse(BaseModel):
    status: str
    modelLoaded: bool
    modelName: str
    version: str
