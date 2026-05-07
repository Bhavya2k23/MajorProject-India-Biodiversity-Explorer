const mongoose = require("mongoose");

const bestScoreSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    timeTaken: {
      type: Number,
      default: 0,
      min: 0,
    },
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaderboardAttempt",
    },
  },
  { timestamps: true }
);

// TTL index: auto-expire best scores after 365 days of inactivity
bestScoreSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model("BestScore", bestScoreSchema);