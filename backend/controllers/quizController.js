const QuizQuestion = require("../models/QuizQuestion");
const User = require("../models/User");
const { sendResponse } = require("../utils/apiResponse");

// ─── Static fallback questions ─────────────────────────────────────
// Used when DB has 0 questions. Prevents infinite loading on frontend.
const STATIC_QUESTIONS = [
  {
    _id: "static-1",
    question: "How many biogeographical zones does India have?",
    options: ["8", "10", "12", "15"],
    correct: 1,
    correctAnswer: "10",
    explanation: "India is divided into 10 distinct biogeographical zones based on climate, vegetation, and wildlife.",
    category: "General",
    difficulty: "Easy",
  },
  {
    _id: "static-2",
    question: "Which species is critically endangered in India?",
    options: ["Bengal Tiger", "Gharial", "Indian Leopard", "Sloth Bear"],
    correct: 1,
    correctAnswer: "Gharial",
    explanation: "The Gharial is critically endangered with only 650-700 individuals remaining.",
    category: "Animals",
    difficulty: "Medium",
  },
  {
    _id: "static-3",
    question: "Which biodiversity hotspot is located in India?",
    options: ["Amazon Rainforest", "Western Ghats", "Sahara Desert", "Great Barrier Reef"],
    correct: 1,
    correctAnswer: "Western Ghats",
    explanation: "The Western Ghats is one of the world's biodiversity hotspots with high levels of endemism.",
    category: "Ecosystems",
    difficulty: "Easy",
  },
  {
    _id: "static-4",
    question: "What percentage of world's species does India host?",
    options: ["2-3%", "5-6%", "7-8%", "10-12%"],
    correct: 2,
    correctAnswer: "7-8%",
    explanation: "India hosts 7-8% of the world's recorded species despite having only 2.4% of the world's land area.",
    category: "General",
    difficulty: "Medium",
  },
  {
    _id: "static-5",
    question: "Where is the only natural habitat of Asiatic Lions?",
    options: ["Sundarbans", "Kaziranga", "Gir Forest", "Jim Corbett"],
    correct: 2,
    correctAnswer: "Gir Forest",
    explanation: "Gir Forest in Gujarat is the only natural habitat of Asiatic Lions.",
    category: "Animals",
    difficulty: "Easy",
  },
  {
    _id: "static-6",
    question: "Which year was the Wildlife Protection Act enacted?",
    options: ["1960", "1972", "1986", "1992"],
    correct: 1,
    correctAnswer: "1972",
    explanation: "The Wildlife Protection Act was enacted in 1972 to provide legal framework for species and habitat protection.",
    category: "Conservation",
    difficulty: "Medium",
  },
  {
    _id: "static-7",
    question: "What is the scientific name of the Banyan tree, India's national tree?",
    options: ["Ficus religiosa", "Ficus benghalensis", "Mangifera indica", "Azadirachta indica"],
    correct: 1,
    correctAnswer: "Ficus benghalensis",
    explanation: "The Banyan tree (Ficus benghalensis) is India's national tree.",
    category: "Plants",
    difficulty: "Hard",
  },
  {
    _id: "static-8",
    question: "Which plant blooms only once every 12 years in Western Ghats?",
    options: ["Sandalwood", "Kurinji", "Cardamom", "Black Pepper"],
    correct: 1,
    correctAnswer: "Kurinji",
    explanation: "Kurinji (Strobilanthes kunthiana) turns the Nilgiri hills blue when it blooms every 12 years.",
    category: "Plants",
    difficulty: "Hard",
  },
  {
    _id: "static-9",
    question: "The Lotus is the national flower of India. What is its scientific name?",
    options: ["Nymphaea pubescens", "Nelumbo nucifera", "Victoria amazonica", "Nuphar lutea"],
    correct: 1,
    correctAnswer: "Nelumbo nucifera",
    explanation: "The Lotus (Nelumbo nucifera) is India's national flower, growing in wetlands.",
    category: "Plants",
    difficulty: "Medium",
  },
  {
    _id: "static-10",
    question: "Which conservation status indicates a species is close to the threatened threshold?",
    options: ["Safe", "Near Threatened", "Vulnerable", "Endangered"],
    correct: 1,
    correctAnswer: "Near Threatened",
    explanation: "Near Threatened means the species does not qualify as threatened now but is likely to in the future.",
    category: "Conservation",
    difficulty: "Easy",
  },
];

// @desc    Get quiz questions (with optional category/difficulty filter)
// @route   GET /api/quiz/questions
// @access  Public
exports.getQuestions = async (req, res, next) => {
  try {
    const { category, difficulty, limit = 20 } = req.query;
    const filter = {};
    if (category)   filter.category = category;
    if (difficulty) filter.difficulty = difficulty;

    const questions = await QuizQuestion.find(filter)
      .limit(parseInt(limit))
      .select("-correctAnswer")
      .sort({ createdAt: -1 })
      .lean();

    // If DB has no questions, return static set so frontend never gets stuck
    if (!questions || questions.length === 0) {
      return sendResponse(res, 200, STATIC_QUESTIONS, "Static fallback questions served", true, { source: "static-fallback", count: STATIC_QUESTIONS.length });
    }

    sendResponse(res, 200, questions, "Quiz questions fetched successfully", true, { count: questions.length });
  } catch (error) {
    // Even on DB error, return static questions so quiz works
    return sendResponse(res, 200, STATIC_QUESTIONS, "Static fallback questions served due to error", true, { source: "error-fallback", count: STATIC_QUESTIONS.length });
  }
};

// @desc    Add new quiz question (admin only)
// @route   POST /api/quiz/questions
// @access  Admin
exports.addQuestion = async (req, res, next) => {
  try {
    const question = await QuizQuestion.create({ ...req.body, createdBy: req.user._id });
    sendResponse(res, 201, question, "Question added successfully");
  } catch (error) {
    next(error);
  }
};

// @desc    Submit quiz answers and calculate score
// @route   POST /api/quiz/submit
// @access  Public
exports.submitQuiz = async (req, res, next) => {
  try {
    const { answers, category } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return sendResponse(res, 400, null, "Answers array is required", false);
    }

    // Handle static fallback questions (IDs start with "static-")
    const dynamicIds = answers
      .map(a => a.questionId)
      .filter(id => !String(id).startsWith("static-"));

    let score   = 0;
    const results = [];

    if (dynamicIds.length > 0) {
      const questions = await QuizQuestion.find({ _id: { $in: dynamicIds } }).lean();
      for (const answer of answers) {
        if (String(answer.questionId).startsWith("static-")) {
          // Find in static pool
          const sq = STATIC_QUESTIONS.find(q => q._id === answer.questionId);
          if (sq) {
            const isCorrect = String(sq.correct) === String(answer.selectedOption) ||
                              sq.correctAnswer === answer.selectedOption;
            if (isCorrect) score++;
            results.push({ questionId: answer.questionId, correct: isCorrect, correctAnswer: sq.correctAnswer });
          }
        } else {
          const q = questions.find(q => q._id.toString() === answer.questionId);
          if (!q) { results.push({ questionId: answer.questionId, correct: false }); continue; }
          const isCorrect = q.correctAnswer === answer.selectedOption;
          if (isCorrect) score++;
          results.push({ questionId: answer.questionId, correct: isCorrect, correctAnswer: q.correctAnswer, yourAnswer: answer.selectedOption });
        }
      }
    } else {
      // All static questions
      for (const answer of answers) {
        const sq = STATIC_QUESTIONS.find(q => q._id === answer.questionId);
        if (sq) {
          const isCorrect = String(sq.correct) === String(answer.selectedOption) ||
                            sq.correctAnswer === answer.selectedOption;
          if (isCorrect) score++;
          results.push({ questionId: answer.questionId, correct: isCorrect, correctAnswer: sq.correctAnswer });
        }
      }
    }

    // Save to user profile if authenticated
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        $push: { quizScores: { score, total: answers.length, category: category || "General" } },
      }).catch(() => {});
    }

    sendResponse(res, 200, {
      score,
      total: answers.length,
      percentage: Math.round((score / answers.length) * 100),
      results,
    }, "Quiz submitted successfully");
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
          _id:           "$_id",
          name:          { $first: "$name" },
          totalScore:    { $sum: "$quizScores.score" },
          totalQuizzes:  { $sum: 1 },
          avgPercentage: {
            $avg: { $multiply: [{ $divide: ["$quizScores.score", "$quizScores.total"] }, 100] },
          },
        },
      },
      { $sort: { totalScore: -1 } },
      { $limit: 100 },
      {
        $project: {
          name: 1, totalScore: 1, totalQuizzes: 1,
          avgPercentage: { $round: ["$avgPercentage", 1] },
        },
      },
    ]);

    sendResponse(res, 200, users, "Leaderboard fetched successfully");
  } catch (error) {
    next(error);
  }
};
