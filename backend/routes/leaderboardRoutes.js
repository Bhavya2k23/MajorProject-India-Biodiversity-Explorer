const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { protect } = require("../middleware/auth");
const { submitQuiz, getLeaderboard, getMyBest } = require("../controllers/leaderboardController");
const { triggerWeeklyReset } = require("../services/cronService");

// POST /api/leaderboard/submit — submit a quiz attempt
router.post(
  "/submit",
  protect,
  [
    body("score")
      .isInt({ min: 0 })
      .withMessage("Score must be a non-negative integer"),
    body("totalQuestions")
      .isInt({ min: 1 })
      .withMessage("Total questions must be at least 1"),
    body("timeTaken")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Time taken must be a non-negative integer (seconds)"),
    body("category")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Category must be a string up to 50 characters"),
  ],
  submitQuiz
);

// GET /api/leaderboard — get top 10 (public)
router.get("/", getLeaderboard);

// GET /api/leaderboard/my-best — get current user's personal best (protected)
router.get("/my-best", protect, getMyBest);

// POST /api/leaderboard/reset — manually trigger weekly reset (admin only)
router.post("/reset", protect, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin only" });
    }
    const deleted = await triggerWeeklyReset();
    res.status(200).json({ success: true, message: `Weekly reset complete`, deleted });
  } catch (error) {
    next(error);
  }
});

module.exports = router;