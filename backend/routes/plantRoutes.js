const express = require("express");
const router = express.Router();
const {
  getAllPlants,
  getPlantById,
  getRecommendations,
  getAllPlantsAdmin,
  createPlant,
  updatePlant,
  deletePlant,
} = require("../controllers/plantController");
const { protect, adminOnly } = require("../middleware/auth");
const upload = require("../middleware/upload");

// ─── CRITICAL: Static routes MUST come before /:id param routes ──

// Public routes
router.get("/", getAllPlants);
router.get("/recommendations/:id", getRecommendations); // ← MUST be before /:id
router.get("/:id", getPlantById);

// Admin protected routes
router.get("/admin/all", protect, adminOnly, getAllPlantsAdmin);

router.post(
  "/",
  protect,
  adminOnly,
  upload.array("images", 5),
  createPlant
);

router.put(
  "/:id",
  protect,
  adminOnly,
  upload.array("images", 5),
  updatePlant
);

router.delete("/:id", protect, adminOnly, deletePlant);

module.exports = router;