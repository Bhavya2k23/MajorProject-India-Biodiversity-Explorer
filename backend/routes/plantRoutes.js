const express = require("express");
const {
  getAllPlants,
  getPlantById,
  getRecommendations,
} = require("../controllers/plantController");

const router = express.Router();

router.get("/", getAllPlants);
router.get("/recommendations/:id", getRecommendations);
router.get("/:id", getPlantById);

module.exports = router;
