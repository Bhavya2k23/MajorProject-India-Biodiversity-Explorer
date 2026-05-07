const { validationResult } = require("express-validator");
const {
  submitAttempt,
  getLeaderboard,
  getUserBestScore,
} = require("../services/leaderboardService");

/**
 * POST /api/leaderboard/submit
 * Submit a quiz attempt (protected route).
 */
exports.submitQuiz = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { score, totalQuestions, timeTaken, category } = req.body;
    const userId = req.user._id;

    const { attempt, isNewBest } = await submitAttempt(
      userId,
      score,
      totalQuestions,
      timeTaken || 0,
      category || "General"
    );

    res.status(201).json({
      success: true,
      message: isNewBest ? "New best score!" : "Attempt submitted",
      attempt: {
        id: attempt._id,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        percentage: attempt.percentage,
        timeTaken: attempt.timeTaken,
        createdAt: attempt.createdAt,
      },
      isNewBest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/leaderboard
 * Get top 10 leaderboard (public).
 */
exports.getLeaderboard = async (req, res, next) => {
  try {
    const { filter = "all", limit = 10 } = req.query;
    const validFilters = ["all", "weekly", "today"];

    if (!validFilters.includes(filter)) {
      return res.status(400).json({
        success: false,
        message: "Invalid filter. Use: all, weekly, or today",
      });
    }

    const leaderboard = await getLeaderboard(filter, Math.min(parseInt(limit) || 10, 100));

    res.status(200).json({
      success: true,
      filter,
      count: leaderboard.length,
      leaderboard,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/leaderboard/my-best
 * Get current user's personal best score (protected).
 */
exports.getMyBest = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const best = await getUserBestScore(userId);

    if (!best) {
      return res.status(404).json({
        success: false,
        message: "No quiz attempts found. Take the quiz first!",
      });
    }

    res.status(200).json({ success: true, data: best });
  } catch (error) {
    next(error);
  }
};