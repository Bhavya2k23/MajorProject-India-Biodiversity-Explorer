const express = require("express");
const router = express.Router();
const {
  getAllSpecies,
  getSpeciesById,
  createSpecies,
  updateSpecies,
  deleteSpecies,
  getRecommendations,
} = require("../controllers/speciesController");
const { protect, adminOnly } = require("../middleware/auth");
const { speciesRules, validate } = require("../middleware/validation");

const upload = require("../middleware/upload");

// Public routes
router.get("/", getAllSpecies);
router.get("/recommendations/:id", getRecommendations);
router.get("/:id", getSpeciesById);

// Admin protected routes
router.post(
  "/",
  protect,
  adminOnly,
  upload.array("images", 5),
  speciesRules,
  validate,
  createSpecies
);
router.put(
  "/:id",
  protect,
  adminOnly,
  upload.array("images", 5),
  updateSpecies
);

// FIX: DELETE route was defined in controller but never registered — caused silent 404s
router.delete("/:id", protect, adminOnly, deleteSpecies);

module.exports = router;
