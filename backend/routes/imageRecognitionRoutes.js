const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { protect } = require("../middleware/auth");

// ─── Multer storage ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `recognition-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error("Only image files (JPEG, PNG, WebP) are allowed."));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
});

// ─── Controller ────────────────────────────────────────────────
const {
  recognizeSpecies,
  getPredictionHistory,
  clearPredictionHistory,
} = require("../controllers/imageRecognitionController");

// Public — upload image and get prediction
// POST /api/recognize
router.post("/", upload.single("image"), recognizeSpecies);

// Protected — get prediction history
// GET /api/recognize/history
router.get("/history", protect, getPredictionHistory);

// Admin — clear prediction history
// DELETE /api/recognize/history
router.delete("/history", protect, clearPredictionHistory);

module.exports = router;
