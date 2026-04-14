/**
 * ============================================
 * RECOMMENDATION ROUTES
 * ============================================
 * API routes for species recommendations
 * Base path: /api/recommendations
 * ============================================
 */

const express = require("express");
const router = express.Router();
const {
  getRecommendations,
  getBatchRecommendations,
  healthCheck,
} = require("../controllers/recommendationController");

// Public routes
router.get("/health", healthCheck);
router.get("/:speciesId", getRecommendations);
router.post("/batch", getBatchRecommendations);

module.exports = router;