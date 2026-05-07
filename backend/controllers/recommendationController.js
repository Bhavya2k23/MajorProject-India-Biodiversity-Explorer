/**
 * ============================================
 * RECOMMENDATION CONTROLLER
 * ============================================
 * API endpoints for species recommendations
 * Handles request/response for GET /api/recommendations/:speciesId
 * ============================================
 */

const recommendationService = require("../services/recommendationService");

/**
 * @desc    Get recommendations for a species
 * @route   GET /api/recommendations/:speciesId
 * @access  Public
 * @param   {string} speciesId - MongoDB ObjectId of the species
 * @query   {number} limit - Max results (default: 5, max: 10)
 * @query   {string} algorithm - "rule-based" or "cosine" (default: rule-based)
 * @returns {Object} { success, recommendedSpecies: [{ name, image, status, ecosystem, score }] }
 */
exports.getRecommendations = async (req, res, next) => {
  try {
    const { speciesId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 5, 10);
    const algorithm = req.query.algorithm || "rule-based";

    // Validate speciesId format
    if (!/^[0-9a-fA-F]{24}$/.test(speciesId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid species ID format",
      });
    }

    // Get recommendations using the service
    const result = await recommendationService.getRecommendations(speciesId, {
      limit,
      useCosine: algorithm === "cosine",
    });

    // Transform response to match API specification
    const recommendedSpecies = result.recommendations.map(rec => ({
      _id: rec._id,
      name: rec.name,
      image: rec.image,
      status: rec.conservationStatus,
      ecosystem: rec.ecosystem,
      scientificName: rec.scientificName,
      type: rec.type,
      zone: rec.zone,
      score: rec.score,
    }));

    // Return formatted response
    res.status(200).json({
      success: true,
      recommendedSpecies,
      metadata: {
        count: recommendedSpecies.length,
        responseTimeMs: result.metadata.responseTimeMs,
        algorithm: result.metadata.algorithm,
        sourceSpeciesId: result.sourceSpeciesId,
      },
    });
  } catch (error) {
    // Handle specific errors
    if (error.message === "Species not found") {
      return res.status(404).json({
        success: false,
        message: "Species not found",
      });
    }
    next(error);
  }
};

/**
 * @desc    Get batch recommendations for multiple species (for caching)
 * @route   POST /api/recommendations/batch
 * @access  Public
 * @body    { speciesIds: string[], limit?: number }
 * @returns {Object} Map of speciesId -> recommendations
 */
exports.getBatchRecommendations = async (req, res, next) => {
  try {
    const { speciesIds, limit = 50 } = req.body;

    if (!Array.isArray(speciesIds) || speciesIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "speciesIds must be a non-empty array",
      });
    }

    if (speciesIds.length > 20) {
      return res.status(400).json({
        success: false,
        message: "Maximum 20 species IDs allowed per request",
      });
    }

    const results = await recommendationService.getBatchRecommendations(
      speciesIds,
      Math.min(limit, 50)
    );

    res.status(200).json({
      success: true,
      results,
      metadata: {
        requestedCount: speciesIds.length,
        returnedCount: Object.keys(results).length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Health check for recommendation service
 * @route   GET /api/recommendations/health
 * @access  Public
 */
exports.healthCheck = async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Recommendation service is running",
    algorithms: ["rule-based", "cosine"],
    scoringRules: {
      ecosystemMatch: 3,
      conservationStatusMatch: 2,
      taxonomyMatch: 1,
    },
  });
};