const LeaderboardAttempt = require("../models/LeaderboardAttempt");
const BestScore = require("../models/BestScore");
const User = require("../models/User");

/**
 * Submit a new quiz attempt.
 * Saves the attempt and updates best score if applicable.
 * @param {string} userId
 * @param {number} score
 * @param {number} totalQuestions
 * @param {number} timeTaken  - seconds
 * @param {string} [category]
 * @returns {Promise<{attempt: object, isNewBest: boolean}>}
 */
async function submitAttempt(userId, score, totalQuestions, timeTaken, category = "General") {
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  // Save attempt
  const attempt = await LeaderboardAttempt.create({
    userId,
    score,
    totalQuestions,
    percentage,
    timeTaken,
    category,
  });

  // Update best score — only if new percentage beats stored OR same percentage with lower time
  const currentBest = await BestScore.findOne({ userId });
  let isNewBest = false;

  if (!currentBest) {
    isNewBest = true;
    await BestScore.create({
      userId,
      score,
      totalQuestions,
      percentage,
      timeTaken,
      attemptId: attempt._id,
    });
  } else if (
    percentage > currentBest.percentage ||
    (percentage === currentBest.percentage && timeTaken < currentBest.timeTaken)
  ) {
    isNewBest = true;
    await BestScore.findByIdAndUpdate(currentBest._id, {
      score,
      totalQuestions,
      percentage,
      timeTaken,
      attemptId: attempt._id,
    });
  }

  return { attempt, isNewBest };
}

/**
 * Get leaderboard entries.
 * @param {"all"|"weekly"|"today"} filter
 * @param {number} [limit=10]
 * @returns {Promise<Array>}
 */
async function getLeaderboard(filter = "all", limit = 100) {
  const now = new Date();
  let dateCutoff;

  if (filter === "today") {
    dateCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (filter === "weekly") {
    // Start of current week (Sunday)
    const dayOfWeek = now.getDay();
    dateCutoff = new Date(now);
    dateCutoff.setDate(now.getDate() - dayOfWeek);
    dateCutoff.setHours(0, 0, 0, 0);
  } else {
    dateCutoff = null;
  }

  const matchStage = dateCutoff ? { createdAt: { $gte: dateCutoff } } : {};

  const entries = await LeaderboardAttempt.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$userId",
        bestScore: { $max: "$score" },
        bestPercentage: { $max: "$percentage" },
        fastestTime: { $min: "$timeTaken" },
        totalAttempts: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        username: "$user.name",
        score: "$bestScore",
        percentage: "$bestPercentage",
        timeTaken: "$fastestTime",
        totalAttempts: 1,
      },
    },
    { $sort: { score: -1, percentage: -1, timeTaken: 1 } },
    { $limit: limit },
  ]);

  // Attach dynamic rank
  return entries.map((entry, index) => ({
    rank: index + 1,
    username: entry.username,
    score: entry.score,
    percentage: entry.percentage,
    timeTaken: entry.timeTaken,
    totalAttempts: entry.totalAttempts,
  }));
}

/**
 * Get the current user's rank within the filtered window.
 * @param {string} userId
 * @param {"all"|"weekly"|"today"} filter
 * @returns {Promise<{rank: number, score: number, percentage: number, timeTaken: number}|null}
 */
async function getUserRank(userId, filter = "all") {
  const leaderboard = await getLeaderboard(filter, 1000);
  return leaderboard.find((entry) => entry._id?.toString() === userId) || null;
}

/**
 * Get a user's personal best score.
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function getUserBestScore(userId) {
  const best = await BestScore.findOne({ userId }).populate("attemptId");
  if (!best) return null;

  // Compute rank across all-time best scores
  const rank = await BestScore.countDocuments({
    $or: [
      { percentage: { $gt: best.percentage } },
      {
        percentage: best.percentage,
        $expr: { $gt: [{ $ifNull: ["$timeTaken", Infinity] }, best.timeTaken] },
      },
    ],
  });

  return {
    score: best.score,
    totalQuestions: best.totalQuestions,
    percentage: best.percentage,
    timeTaken: best.timeTaken,
    rank: rank + 1,
    updatedAt: best.updatedAt,
  };
}

/**
 * Delete all attempts older than the given date cutoff.
 * Used by the weekly cron reset.
 * @param {Date} cutoffDate
 * @returns {Promise<number>} number of deleted documents
 */
async function deleteOldAttempts(cutoffDate) {
  const result = await LeaderboardAttempt.deleteMany({
    createdAt: { $lt: cutoffDate },
  });
  return result.deletedCount;
}

module.exports = {
  submitAttempt,
  getLeaderboard,
  getUserRank,
  getUserBestScore,
  deleteOldAttempts,
};