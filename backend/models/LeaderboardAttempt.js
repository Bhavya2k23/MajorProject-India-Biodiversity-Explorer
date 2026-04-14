const mongoose = require("mongoose");

const leaderboardAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    score: {
      type: Number,
      required: [true, "Score is required"],
      min: [0, "Score cannot be negative"],
    },
    totalQuestions: {
      type: Number,
      required: [true, "Total questions is required"],
      min: [1, "Total questions must be at least 1"],
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    timeTaken: {
      type: Number,
      required: [true, "Time taken is required"],
      min: [0, "Time taken cannot be negative"],
      default: 0,
    },
    category: {
      type: String,
      default: "General",
    },
  },
  { timestamps: true }
);

// Compound index for fast leaderboard queries: sort by score/percentage desc, timeTaken asc
leaderboardAttemptSchema.index({ score: -1, percentage: -1, timeTaken: 1 });

// Index on createdAt for time-based filtering (daily/weekly resets)
leaderboardAttemptSchema.index({ createdAt: -1 });

// Compound index for per-user-per-day uniqueness check
leaderboardAttemptSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("LeaderboardAttempt", leaderboardAttemptSchema);