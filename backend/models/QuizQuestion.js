const mongoose = require("mongoose");

const quizQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    options: {
      type: [String],
      validate: {
        validator: (arr) => arr.length === 4,
        message: "Exactly 4 options are required",
      },
      required: true,
    },
    correctAnswer: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
      comment: "Index of correct option (0-3)",
    },
    category: {
      type: String,
      enum: ["Species", "Ecosystem", "Zone", "Conservation", "General"],
      default: "General",
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuizQuestion", quizQuestionSchema);
