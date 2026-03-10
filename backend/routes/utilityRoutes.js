const express = require("express");
const router = express.Router();
const { globalSearch } = require("../controllers/searchController");
const { chatbot } = require("../controllers/chatbotController");
const { predictStatus } = require("../controllers/predictionController");

// Search
router.get("/search", globalSearch);

// Chatbot
router.post("/chatbot", chatbot);

// ML Prediction
router.post("/predict", predictStatus);

module.exports = router;
