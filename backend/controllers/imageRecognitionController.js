const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const PredictionHistory = require("../models/PredictionHistory");
const logger = require("../utils/logger");

// ─── Config ────────────────────────────────────────────────────
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const AI_SERVICE_TIMEOUT = 30000; // 30 seconds

// ─── AI Service Health Cache ───────────────────────────────────
let aiServiceHealthy = true;
let lastHealthCheck = 0;
const HEALTH_CACHE_TTL = 30000; // 30 seconds

/**
 * Check if AI service is reachable (with caching to avoid hammering).
 */
async function checkAIServiceHealth() {
  const now = Date.now();
  if (aiServiceHealthy && (now - lastHealthCheck) < HEALTH_CACHE_TTL) {
    return aiServiceHealthy;
  }
  try {
    await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 3000 });
    aiServiceHealthy = true;
    lastHealthCheck = now;
    return true;
  } catch {
    aiServiceHealthy = false;
    lastHealthCheck = now;
    return false;
  }
}

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Forward image buffer to Python AI service and return prediction.
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} filename - Original filename
 * @param {string} mimetype - MIME type
 */
async function callAIService(fileBuffer, filename, mimetype, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const form = new FormData();
    form.append("image", fileBuffer, {
      filename: filename || "image.jpg",
      contentType: mimetype || "image/jpeg",
    });

    try {
      const response = await axios.post(`${AI_SERVICE_URL}/predict`, form, {
        headers: form.getHeaders(),
        timeout: AI_SERVICE_TIMEOUT,
        maxBodyLength: 6 * 1024 * 1024,  // 6MB
        maxContentLength: 6 * 1024 * 1024,
      });
      return response.data;
    } catch (aiErr) {
      const status = aiErr.response?.status;
      const isRateLimited = status === 429;
      const isLastAttempt = attempt === retries;

      // If rate limited, wait and retry
      if (isRateLimited && !isLastAttempt) {
        const retryAfter = aiErr.response?.headers?.["retry-after"];
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(2000 * Math.pow(2, attempt), 10000);
        logger.warn("image-recognition", `AI service rate limited (attempt ${attempt + 1}/${retries + 1}). Retrying in ${waitMs}ms`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }

      // On last attempt or non-retryable error, throw
      if (aiErr.code === "ECONNREFUSED" || aiErr.code === "ETIMEDOUT") {
        const err = new Error("AI recognition service is temporarily unavailable. Please try again later.");
        err.code = "SERVICE_UNAVAILABLE";
        throw err;
      }

      const detail = aiErr.response?.data?.detail || aiErr.message;
      const error = new Error(`AI service error: ${detail}`);
      error.status = status;
      throw error;
    }
  }
}

/**
 * Get public URL for a stored image.
 */
function getImageUrl(req, filename) {
  const base = `${req.protocol}://${req.get("host")}`;
  return `${base}/uploads/${filename}`;
}

// ─── Controller ───────────────────────────────────────────────

/**
 * POST /api/recognize
 * Upload image → AI service → save history → return result
 */
exports.recognizeSpecies = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided. Send a multipart/form-data with field 'image'.",
      });
    }

    const startTime = Date.now();
    logger.info("image-recognition", "Image upload received", { fileSize: req.file.size, mimeType: req.file.mimetype });

    // Read file from disk (buffer is only available with memory storage)
    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(req.file.path);
    } catch (readErr) {
      logger.error("image-recognition", "Failed to read uploaded file", { error: readErr.message });
      return res.status(500).json({
        success: false,
        message: "Failed to read uploaded file.",
      });
    }

    // Proactive health check — use mock predictions if service unavailable
    const isHealthy = await checkAIServiceHealth();
    let useMock = false;
    if (!isHealthy) {
      logger.warn("image-recognition", "AI service unavailable — using mock predictions");
      useMock = true;
    }

    // Forward to Python AI service (with retry for rate limits)
    let prediction;
    try {
      prediction = await callAIService(
        fileBuffer,
        req.file.originalname,
        req.file.mimetype
      );
    } catch (aiErr) {
      logger.error("image-recognition", "AI service call failed", { error: aiErr.message });

      if (aiErr.code === "SERVICE_UNAVAILABLE") {
        useMock = true;
      } else {
        return res.status(502).json({
          success: false,
          message: aiErr.message || "AI service returned an error.",
          error: aiErr.response?.data?.detail || aiErr.message,
        });
      }
    }

    // Use mock predictions when AI service is unavailable
    // All mock predictions are Indian species with realistic confidences
    if (useMock) {
      const mockPredictions = [
        { label: "Bengal Tiger (Panthera tigris tigris)", confidence: 0.92 },
        { label: "Indian Elephant (Elephas maximus indicus)", confidence: 0.78 },
        { label: "Indian Peafowl (Pavo cristatus)", confidence: 0.72 },
        { label: "Asiatic Lion (Panthera leo persica)", confidence: 0.65 },
        { label: "Sambar Deer (Rusa unicolor)", confidence: 0.58 },
        { label: "Bengal Fox (Vulpes bengalensis)", confidence: 0.52 },
        { label: "Great Hornbill (Buceros bicornis)", confidence: 0.48 },
        { label: "King Cobra (Ophiophagus hannah)", confidence: 0.45 },
        { label: "Indian Pitta (Pitta brachyura)", confidence: 0.42 },
        { label: "White-Rumped Vulture (Gyps bengalensis)", confidence: 0.38 },
      ];
      // Filter to only those above 60% confidence (or include top 3 regardless)
      const aboveThreshold = mockPredictions.filter(p => p.confidence >= 0.6);
      const top3 = aboveThreshold.length >= 3 ? aboveThreshold.slice(0, 3) : mockPredictions.slice(0, 3);
      const top = top3[0];

      // Save mock prediction to history
      const processingTimeMs = Date.now() - startTime;
      const imageUrl = getImageUrl(req, req.file.filename);

      let historyEntry;
      try {
        historyEntry = await PredictionHistory.create({
          imageUrl,
          predictedSpecies: top.label,
          confidenceScore: top.confidence,
          top3Predictions: top3,
          userId: req.user?._id || null,
          fileSize: req.file.size,
          processingTimeMs,
          mockPrediction: true,  // Track that this was a mock/fallback prediction
        });
      } catch (dbErr) {
        logger.error("image-recognition", "Failed to save history", { error: dbErr.message });
      }

      logger.info("image-recognition", "Mock prediction served", { processingTimeMs, topPrediction: top.label });

      return res.status(200).json({
        success: true,
        data: {
          predictedSpecies: top.label,
          confidenceScore: top.confidence,
          top3Predictions: top3,
          imageUrl,
          processingTimeMs,
          historyId: historyEntry?._id || null,
          mockPrediction: true,  // Flag to indicate this is a demo prediction (AI service unavailable)
        },
      });
    }

    // Server-side minimum confidence threshold (60%)
    const MIN_SERVER_CONFIDENCE = 0.60;

    const processingTimeMs = Date.now() - startTime;
    const imageUrl = getImageUrl(req, req.file.filename);

    // Filter predictions server-side to only return those above confidence threshold
    const filteredTop3 = (prediction.top3Predictions || []).filter(p => p.confidence >= MIN_SERVER_CONFIDENCE);
    const topPrediction = filteredTop3[0] || prediction.top3Predictions?.[0] || { label: prediction.predictedSpecies, confidence: prediction.confidenceScore };

    // Save prediction to history
    let historyEntry;
    try {
      historyEntry = await PredictionHistory.create({
        imageUrl,
        predictedSpecies: topPrediction.label,
        confidenceScore: topPrediction.confidence,
        top3Predictions: filteredTop3.length > 0 ? filteredTop3 : prediction.top3Predictions,
        userId: req.user?._id || null,
        fileSize: req.file.size,
        processingTimeMs,
        mockPrediction: false,  // Real AI prediction
      });
    } catch (dbErr) {
      // Non-fatal: log but don't fail the request
      logger.error("image-recognition", "Failed to save prediction history", { error: dbErr.message });
    }

    logger.info("image-recognition", "Real AI prediction served", { processingTimeMs, topPrediction: topPrediction.label });

    res.status(200).json({
      success: true,
      data: {
        predictedSpecies: topPrediction.label,
        confidenceScore: topPrediction.confidence,
        top3Predictions: filteredTop3,
        top3AllPredictions: prediction.top3Predictions, // Include all for reference
        imageUrl,
        processingTimeMs,
        historyId: historyEntry?._id || null,
        mockPrediction: false,  // Indicate this is a real AI prediction
        confidenceThreshold: MIN_SERVER_CONFIDENCE,
        predictionsAboveThreshold: prediction.predictionsAboveThreshold || filteredTop3.length,
        isIndianSpecies: prediction.isIndianSpecies ?? true,
      },
    });
  } catch (err) {
    logger.error("image-recognition", "Unexpected error in recognizeSpecies", { error: err.message, stack: err.stack });
    next(err);
  }
};

/**
 * GET /api/recognize/history
 * Get prediction history for the logged-in user
 */
exports.getPredictionHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const query = { userId: req.user._id };

    const [history, total] = await Promise.all([
      PredictionHistory.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PredictionHistory.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: history,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error("image-recognition", "Failed to get prediction history", { error: err.message });
    next(err);
  }
};

/**
 * DELETE /api/recognize/history
 * Admin: clear all prediction history
 */
exports.clearPredictionHistory = async (req, res, next) => {
  try {
    const result = await PredictionHistory.deleteMany({});
    logger.info("image-recognition", "Prediction history cleared", { deletedCount: result.deletedCount });
    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} prediction records.`,
    });
  } catch (err) {
    logger.error("image-recognition", "Failed to clear prediction history", { error: err.message });
    next(err);
  }
};
