const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const PredictionHistory = require("../models/PredictionHistory");

// ─── Config ────────────────────────────────────────────────────
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const AI_SERVICE_TIMEOUT = 30000; // 30 seconds

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Forward image buffer to Python AI service and return prediction.
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} filename - Original filename
 * @param {string} mimetype - MIME type
 */
async function callAIService(fileBuffer, filename, mimetype) {
  const form = new FormData();
  form.append("image", fileBuffer, {
    filename: filename || "image.jpg",
    contentType: mimetype || "image/jpeg",
  });

  const response = await axios.post(`${AI_SERVICE_URL}/predict`, form, {
    headers: form.getHeaders(),
    timeout: AI_SERVICE_TIMEOUT,
    maxBodyLength: 6 * 1024 * 1024,  // 6MB
    maxContentLength: 6 * 1024 * 1024,
  });

  return response.data;
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

    // Read file from disk (buffer is only available with memory storage)
    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(req.file.path);
    } catch (readErr) {
      return res.status(500).json({
        success: false,
        message: "Failed to read uploaded file.",
      });
    }

    // Forward to Python AI service
    let prediction;
    try {
      prediction = await callAIService(
        fileBuffer,
        req.file.originalname,
        req.file.mimetype
      );
    } catch (aiErr) {
      console.error("[ImageRecognition] AI service error:", aiErr.message);

      // Graceful degradation: if AI service is down, return error
      if (aiErr.code === "ECONNREFUSED" || aiErr.code === "ETIMEDOUT") {
        return res.status(503).json({
          success: false,
          message: "AI recognition service is temporarily unavailable. Please try again later.",
          error: "SERVICE_UNAVAILABLE",
        });
      }

      return res.status(502).json({
        success: false,
        message: "AI service returned an error.",
        error: aiErr.response?.data?.detail || aiErr.message,
      });
    }

    const processingTimeMs = Date.now() - startTime;
    const imageUrl = getImageUrl(req, req.file.filename);

    // Save prediction to history
    let historyEntry;
    try {
      historyEntry = await PredictionHistory.create({
        imageUrl,
        predictedSpecies: prediction.predictedSpecies,
        confidenceScore: prediction.confidenceScore,
        top3Predictions: prediction.top3Predictions,
        userId: req.user?._id || null,
        fileSize: req.file.size,
        processingTimeMs,
      });
    } catch (dbErr) {
      // Non-fatal: log but don't fail the request
      console.error("[ImageRecognition] Failed to save history:", dbErr.message);
    }

    res.status(200).json({
      success: true,
      data: {
        predictedSpecies: prediction.predictedSpecies,
        confidenceScore: prediction.confidenceScore,
        top3Predictions: prediction.top3Predictions,
        imageUrl,
        processingTimeMs,
        historyId: historyEntry?._id || null,
      },
    });
  } catch (err) {
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
    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} prediction records.`,
    });
  } catch (err) {
    next(err);
  }
};
