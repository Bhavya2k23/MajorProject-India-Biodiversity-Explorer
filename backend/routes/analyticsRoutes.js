const express = require("express");
const router = express.Router();
const {
  getDashboardAnalytics,
  getEcosystemStats,
  getAllUsers,
  getBiodiversityInsights,
} = require("../controllers/analyticsController");
const { protect, adminOnly } = require("../middleware/auth");

// Public — powers the Biodiversity Insights page
router.get("/biodiversity", getBiodiversityInsights);

router.get("/", protect, adminOnly, getDashboardAnalytics);
router.get("/ecosystems", getEcosystemStats);
router.get("/users", protect, adminOnly, getAllUsers);

module.exports = router;
