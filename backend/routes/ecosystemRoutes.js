const express = require("express");
const router = express.Router();
const {
  getAllEcosystems,
  getEcosystemById,
  createEcosystem,
  updateEcosystem,
  deleteEcosystem,
} = require("../controllers/ecosystemController");
const { protect, adminOnly } = require("../middleware/auth");

router.get("/", getAllEcosystems);
router.get("/:id", getEcosystemById);
router.post("/", protect, adminOnly, createEcosystem);
router.put("/:id", protect, adminOnly, updateEcosystem);
router.delete("/:id", protect, adminOnly, deleteEcosystem);

module.exports = router;
