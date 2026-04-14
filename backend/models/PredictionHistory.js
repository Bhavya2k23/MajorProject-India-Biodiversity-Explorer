const mongoose = require("mongoose");

const predictionHistorySchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: true,
    },
    predictedSpecies: {
      type: String,
      required: true,
      trim: true,
    },
    confidenceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    top3Predictions: [
      {
        label: { type: String },
        confidence: { type: Number, min: 0, max: 1 },
      },
    ],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    processingTimeMs: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookups
predictionHistorySchema.index({ predictedSpecies: "text" });
predictionHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model("PredictionHistory", predictionHistorySchema);
