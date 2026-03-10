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

// Public routes
router.get("/", getAllSpecies);
router.get("/recommendations/:id", getRecommendations);
router.get("/:id", getSpeciesById);

// Admin protected routes
router.post("/", protect, adminOnly, speciesRules, validate, createSpecies);
router.put("/:id", protect, adminOnly, updateSpecies);
router.delete("/:id", protect, adminOnly, deleteSpecies);

module.exports = router;
