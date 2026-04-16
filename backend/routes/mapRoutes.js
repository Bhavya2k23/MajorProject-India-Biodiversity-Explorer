const express = require("express");
const router = express.Router();
const {
  getMapSpecies
} = require("../controllers/mapController");

// GET /api/map/species - Get all species with coordinates for map display
router.get("/species", getMapSpecies);

module.exports = router;