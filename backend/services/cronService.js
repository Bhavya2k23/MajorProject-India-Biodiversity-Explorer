const cron = require("node-cron");
const { deleteOldAttempts } = require("./leaderboardService");

let scheduledJob = null;

/**
 * Start the weekly leaderboard reset cron job.
 * Runs every Monday at midnight UTC.
 * Deletes all LeaderboardAttempt documents created before the start of the current week.
 */
function startWeeklyReset() {
  if (scheduledJob) {
    console.log("⚠️  Weekly reset cron already running");
    return;
  }

  // Schedule: '0 0 * * MON' — every Monday at 00:00 UTC
  scheduledJob = cron.schedule("0 0 * * MON", async () => {
    console.log("🕐 [CRON] Weekly leaderboard reset started...");

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    try {
      const deleted = await deleteOldAttempts(startOfWeek);
      console.log(`✅ [CRON] Weekly reset complete — ${deleted} old attempt(s) removed`);
    } catch (error) {
      console.error("❌ [CRON] Weekly reset failed:", error.message);
    }
  });

  console.log("⏰ Weekly leaderboard reset cron job scheduled (every Monday 00:00 UTC)");
}

/**
 * Stop the cron job (useful for testing).
 */
function stopWeeklyReset() {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    console.log("🛑 Weekly reset cron job stopped");
  }
}

/**
 * Manually trigger a reset (for admin API or testing).
 * @returns {Promise<number>} deleted count
 */
async function triggerWeeklyReset() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  const deleted = await deleteOldAttempts(startOfWeek);
  return deleted;
}

module.exports = { startWeeklyReset, stopWeeklyReset, triggerWeeklyReset };