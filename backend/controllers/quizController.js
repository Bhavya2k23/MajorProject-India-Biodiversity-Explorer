const QuizQuestion = require("../models/QuizQuestion");
const User = require("../models/User");

// @desc    Get quiz questions (with optional category/difficulty filter)
// @route   GET /api/quiz/questions
// @access  Public
exports.getQuestions = async (req, res, next) => {
  try {
    const { category, difficulty, limit = 100 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;

    const questions = await QuizQuestion.find(filter)
      .limit(parseInt(limit))
      .select("-correctAnswer") // Don't send answer to client
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: questions.length, data: questions });
  } catch (error) {
    next(error);
  }
};

// @desc    Add new quiz question (admin only)
// @route   POST /api/quiz/questions
// @access  Admin
exports.addQuestion = async (req, res, next) => {
  try {
    const question = await QuizQuestion.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, message: "Question added", data: question });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit quiz answers and calculate score
// @route   POST /api/quiz/submit
// @access  Private
exports.submitQuiz = async (req, res, next) => {
  try {
    const { answers, category } = req.body;
    // answers: [{ questionId, selectedOption }]

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: "Answers array is required" });
    }

    const questionIds = answers.map((a) => a.questionId);
    const questions = await QuizQuestion.find({ _id: { $in: questionIds } });

    let score = 0;
    const results = answers.map((answer) => {
      const question = questions.find((q) => q._id.toString() === answer.questionId);
      if (!question) return { questionId: answer.questionId, correct: false };
      const isCorrect = question.correctAnswer === answer.selectedOption;
      if (isCorrect) score++;
      return {
        questionId: answer.questionId,
        correct: isCorrect,
        correctAnswer: question.correctAnswer,
        yourAnswer: answer.selectedOption,
      };
    });

    // Save score to user profile if authenticated
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        $push: { quizScores: { score, total: answers.length, category: category || "General" } },
      });
    }

    res.status(200).json({
      success: true,
      score,
      total: answers.length,
      percentage: Math.round((score / answers.length) * 100),
      results,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leaderboard (top quiz scorers)
// @route   GET /api/quiz/leaderboard
// @access  Public
exports.getLeaderboard = async (req, res, next) => {
  try {
    const users = await User.aggregate([
      { $unwind: "$quizScores" },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          totalScore: { $sum: "$quizScores.score" },
          totalQuizzes: { $sum: 1 },
          avgPercentage: {
            $avg: {
              $multiply: [{ $divide: ["$quizScores.score", "$quizScores.total"] }, 100],
            },
          },
        },
      },
      { $sort: { totalScore: -1 } },
      { $limit: 100 },
      {
        $project: {
          name: 1,
          totalScore: 1,
          totalQuizzes: 1,
          avgPercentage: { $round: ["$avgPercentage", 1] },
        },
      },
    ]);

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};
