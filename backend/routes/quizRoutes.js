const express = require("express");
const router = express.Router();
const { getQuestions, addQuestion, submitQuiz, getLeaderboard } = require("../controllers/quizController");
const { protect, adminOnly } = require("../middleware/auth");

router.get("/questions", getQuestions);
router.post("/questions", protect, adminOnly, addQuestion);
router.post("/submit", protect, submitQuiz);
router.get("/leaderboard", getLeaderboard);

module.exports = router;
