const express = require("express");
const router = express.Router();
const { globalSearch, getSearchSuggestions } = require("../controllers/searchController");
const { chatbot } = require("../controllers/chatbotController");
const { predictStatus } = require("../controllers/predictionController");

// Search
router.get("/search", globalSearch);
router.get("/search/suggestions", getSearchSuggestions);  // NEW: autocomplete suggestions

// Chatbot
router.post("/chatbot", chatbot);

// ML Prediction
router.post("/predict", predictStatus);

module.exports = router;
