const axios     = require("axios");
const FormData  = require("form-data");
const fs        = require("fs");
const PredictionHistory = require("../models/PredictionHistory");
const Species   = require("../models/Species");
const logger    = require("../utils/logger");
const { getSpeciesIcon } = require("../utils/getSpeciesIcon");

// ─── Config ────────────────────────────────────────────────────────
const AI_SERVICE_URL     = process.env.AI_SERVICE_URL || "http://localhost:8000";
const AI_SERVICE_TIMEOUT = 30000; // 30 seconds

// ─── Confidence threshold — predictions below this return "Not sure" ─
const CONFIDENCE_THRESHOLD = 0.60;

// ─── AI Service Health Cache ───────────────────────────────────────
let aiServiceHealthy = null;
let lastHealthCheck  = 0;
const HEALTH_CACHE_TTL = 30000;

async function checkAIServiceHealth() {
  const now = Date.now();
  if (aiServiceHealthy !== null && (now - lastHealthCheck) < HEALTH_CACHE_TTL) {
    return aiServiceHealthy;
  }
  try {
    await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 3000 });
    aiServiceHealthy = true;
    lastHealthCheck  = now;
    return true;
  } catch (err) {
    aiServiceHealthy = false;
    lastHealthCheck  = now;
    logger.warn("image-recognition", "AI service health check failed", { error: err.message });
    return false;
  }
}

// ─── Call AI Service ───────────────────────────────────────────────
async function callAIService(fileBuffer, filename, mimetype, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const form = new FormData();
    form.append("image", fileBuffer, {
      filename:    filename || "image.jpg",
      contentType: mimetype || "image/jpeg",
    });

    try {
      const response = await axios.post(`${AI_SERVICE_URL}/predict`, form, {
        headers:          form.getHeaders(),
        timeout:          AI_SERVICE_TIMEOUT,
        maxBodyLength:    6 * 1024 * 1024,
        maxContentLength: 6 * 1024 * 1024,
      });
      return response.data;
    } catch (aiErr) {
      const status      = aiErr.response?.status;
      const isLastAttempt = attempt === retries;

      logger.warn("image-recognition", `AI service call failed (attempt ${attempt + 1}/${retries + 1})`, {
        error: aiErr.message, status, code: aiErr.code,
      });

      if (aiErr.code === "ECONNREFUSED") {
        const err = new Error("AI recognition service is not running. Please start the AI service on port 8000.");
        err.code = "SERVICE_UNAVAILABLE";
        throw err;
      }
      if (aiErr.code === "ETIMEDOUT" || aiErr.code === "ECONNABORTED") {
        const err = new Error("AI service timed out. The service may be overloaded.");
        err.code = "SERVICE_TIMEOUT";
        throw err;
      }
      if (isLastAttempt) {
        const detail = aiErr.response?.data?.detail || aiErr.message;
        const error  = new Error(`AI service error: ${detail}`);
        error.status = status;
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// ─── Known Indian species list (for prediction validation) ────────
// Only accept predictions that match species in our database
async function validateAgainstDatabase(label) {
  try {
    const species = await Species.findOne({
      name: { $regex: label, $options: "i" },
    }).lean();
    return !!species;
  } catch {
    return true; // If DB check fails, don't block the prediction
  }
}

// ─── Mock predictions (Indian species, realistic confidences) ─────
const MOCK_PREDICTIONS_POOL = [
  { label: "Bengal Tiger",   confidence: 0.87, scientificName: "Panthera tigris tigris" },
  { label: "Indian Elephant", confidence: 0.83, scientificName: "Elephas maximus indicus" },
  { label: "Indian Peafowl", confidence: 0.79, scientificName: "Pavo cristatus" },
  { label: "Asiatic Lion",   confidence: 0.75, scientificName: "Panthera leo persica" },
  { label: "King Cobra",     confidence: 0.71, scientificName: "Ophiophagus hannah" },
  { label: "Indian Leopard", confidence: 0.68, scientificName: "Panthera pardus fusca" },
  { label: "Sambar Deer",    confidence: 0.64, scientificName: "Rusa unicolor" },
  { label: "Great Hornbill", confidence: 0.61, scientificName: "Buceros bicornis" },
  { label: "Gharial",        confidence: 0.58, scientificName: "Gavialis gangeticus" },
  { label: "Snow Leopard",   confidence: 0.55, scientificName: "Panthera uncia" },
];

function getMockPredictions() {
  return MOCK_PREDICTIONS_POOL.slice(0, 3).map((p, i) => ({
    label:      p.label,
    confidence: Math.max(0.45, p.confidence - i * 0.08),
  }));
}

function getImageUrl(req, filename) {
  const base = `${req.protocol}://${req.get("host")}`;
  return `${base}/uploads/${filename}`;
}

// ─── Apply confidence threshold ────────────────────────────────────
// If top prediction confidence < CONFIDENCE_THRESHOLD → return "Not sure"
function applyConfidenceThreshold(predictions) {
  if (!predictions || predictions.length === 0) {
    return { notSure: true, predictions: [] };
  }
  const top = predictions[0];
  if ((top.confidence || 0) < CONFIDENCE_THRESHOLD) {
    return { notSure: true, predictions };
  }
  return { notSure: false, predictions };
}

// ─── Controller ────────────────────────────────────────────────────

// POST /api/recognize
exports.recognizeSpecies = async (req, res, next) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided. Send a multipart/form-data request with field 'image'.",
      });
    }

    logger.info("image-recognition", "Image upload received", {
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });

    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(req.file.path);
    } catch (readErr) {
      return res.status(500).json({ success: false, message: "Failed to read uploaded file." });
    }

    const imageUrl = getImageUrl(req, req.file.filename);

    const isHealthy = await checkAIServiceHealth();
    let prediction   = null;
    let aiErrorMessage = null;
    let useMock      = !isHealthy;

    if (!useMock) {
      try {
        prediction = await callAIService(fileBuffer, req.file.originalname, req.file.mimetype);
      } catch (aiErr) {
        logger.error("image-recognition", "AI service call failed", { error: aiErr.message });
        aiErrorMessage = aiErr.message;
        useMock = true;
      }
    }

    const processingTimeMs = Date.now() - startTime;

    // ─── Mock prediction path ──────────────────────────────────────
    if (useMock) {
      const mockTop3 = getMockPredictions();
      const { notSure, predictions } = applyConfidenceThreshold(mockTop3);
      const top = notSure
        ? { label: "Not sure", confidence: mockTop3[0]?.confidence || 0 }
        : mockTop3[0];

      try {
        await PredictionHistory.create({
          imageUrl,
          predictedSpecies: top.label,
          confidenceScore:  top.confidence,
          top3Predictions:  predictions,
          userId:           req.user?._id || null,
          fileSize:         req.file.size,
          processingTimeMs,
          mockPrediction:   true,
        });
      } catch (dbErr) {
        logger.error("image-recognition", "Failed to save mock history", { error: dbErr.message });
      }

      return res.status(200).json({
        success: true,
        data: {
          predictedSpecies:    top.label,
          confidenceScore:     top.confidence,
          confidencePercent:   Math.round(top.confidence * 100),
          isNotSure:           notSure,
          top3Predictions:     predictions,
          imageUrl,
          processingTimeMs,
          mockPrediction:      true,
          aiServiceUnavailable: true,
          icon:                notSure ? "🤔" : getSpeciesIcon(top.label, "", ""),
          fallbackMessage:     aiErrorMessage || "AI service is currently unavailable. Showing demo predictions.",
        },
      });
    }

    // ─── Real AI prediction path ───────────────────────────────────
    const rawTop3 = prediction.top3Predictions || [];
    const { notSure, predictions: filteredTop3 } = applyConfidenceThreshold(rawTop3);

    const topPrediction = notSure
      ? { label: "Not sure", confidence: rawTop3[0]?.confidence || 0 }
      : (rawTop3[0] || { label: prediction.predictedSpecies, confidence: prediction.confidenceScore });

    try {
      await PredictionHistory.create({
        imageUrl,
        predictedSpecies: topPrediction.label,
        confidenceScore:  topPrediction.confidence,
        top3Predictions:  filteredTop3,
        userId:           req.user?._id || null,
        fileSize:         req.file.size,
        processingTimeMs,
        mockPrediction:   false,
      });
    } catch (dbErr) {
      logger.error("image-recognition", "Failed to save prediction history", { error: dbErr.message });
    }

    logger.info("image-recognition", "Real AI prediction served", {
      processingTimeMs,
      topPrediction: topPrediction.label,
      confidence:    topPrediction.confidence,
      notSure,
    });

    res.status(200).json({
      success: true,
      data: {
        predictedSpecies:           topPrediction.label,
        confidenceScore:            topPrediction.confidence,
        confidencePercent:          Math.round(topPrediction.confidence * 100),
        isNotSure:                  notSure,
        top3Predictions:            filteredTop3,
        imageUrl,
        processingTimeMs,
        mockPrediction:             false,
        confidenceThreshold:        CONFIDENCE_THRESHOLD,
        predictionsAboveThreshold:  prediction.predictionsAboveThreshold || filteredTop3.length,
        isIndianSpecies:            prediction.isIndianSpecies ?? true,
        icon:                       notSure ? "🤔" : getSpeciesIcon(topPrediction.label, "", ""),
      },
    });
  } catch (err) {
    logger.error("image-recognition", "Unexpected error in recognizeSpecies", {
      error: err.message,
      stack: err.stack,
    });
    next(err);
  }
};

// GET /api/recognize/history
exports.getPredictionHistory = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip  = (page - 1) * limit;

    const query = { userId: req.user._id };
    const [history, total] = await Promise.all([
      PredictionHistory.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      PredictionHistory.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: history,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error("image-recognition", "Failed to get prediction history", { error: err.message });
    next(err);
  }
};

// DELETE /api/recognize/history  (Admin)
exports.clearPredictionHistory = async (req, res, next) => {
  try {
    const result = await PredictionHistory.deleteMany({});
    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} prediction records.`,
    });
  } catch (err) {
    logger.error("image-recognition", "Failed to clear prediction history", { error: err.message });
    next(err);
  }
};