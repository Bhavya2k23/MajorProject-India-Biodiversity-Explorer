const express = require("express");
const router = express.Router();
const { getDashboardAnalytics, getEcosystemStats, getAllUsers } = require("../controllers/analyticsController");
const { protect, adminOnly } = require("../middleware/auth");

router.get("/", protect, adminOnly, getDashboardAnalytics);
router.get("/ecosystems", getEcosystemStats);
router.get("/users", protect, adminOnly, getAllUsers);

module.exports = router;
