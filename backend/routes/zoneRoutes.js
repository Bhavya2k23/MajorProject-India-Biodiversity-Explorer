const express = require("express");
const router = express.Router();
const {
  getAllZones,
  getZoneById,
  createZone,
  updateZone,
  deleteZone,
} = require("../controllers/zoneController");
const { protect, adminOnly } = require("../middleware/auth");

router.get("/", getAllZones);
router.get("/:id", getZoneById);
router.post("/", protect, adminOnly, createZone);
router.put("/:id", protect, adminOnly, updateZone);
router.delete("/:id", protect, adminOnly, deleteZone);

module.exports = router;
