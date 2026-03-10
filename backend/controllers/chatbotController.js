const Species = require("../models/Species");
const Ecosystem = require("../models/Ecosystem");
const Zone = require("../models/Zone");

// Keyword extraction helper
const extractKeywords = (query) => {
  const stopWords = ["tell", "me", "about", "what", "is", "the", "a", "an", "show", "give", "information", "on", "of"];
  return query
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.includes(word));
};

// Simple intent detection
const detectIntent = (query) => {
  const lower = query.toLowerCase();
  if (lower.includes("ecosystem")) return "ecosystem";
  if (lower.includes("zone")) return "zone";
  if (lower.includes("endangered") || lower.includes("extinction")) return "endangered";
  if (lower.includes("conservation")) return "conservation";
  return "species";
};

// @desc    Chatbot endpoint - returns relevant biodiversity info
// @route   POST /api/chatbot
// @access  Public
exports.chatbot = async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Please provide a query" });
    }

    const keywords = extractKeywords(query);
    const intent = detectIntent(query);
    const regex = new RegExp(keywords.join("|"), "i");

    let response = {};
    let message = "";

    if (intent === "ecosystem") {
      const ecosystems = await Ecosystem.find({
        $or: [{ name: regex }, { description: regex }],
      }).limit(3);

      if (ecosystems.length > 0) {
        message = `Found ${ecosystems.length} ecosystem(s) matching your query.`;
        response = { type: "ecosystems", data: ecosystems };
      } else {
        message = "No ecosystems found for your query. Try searching for 'tropical forest' or 'mangrove'.";
        response = { type: "none", data: [] };
      }
    } else if (intent === "zone") {
      const zones = await Zone.find({
        $or: [{ zoneName: regex }, { description: regex }],
      }).limit(3);

      if (zones.length > 0) {
        message = `Found ${zones.length} zone(s) matching your query.`;
        response = { type: "zones", data: zones };
      } else {
        message = "No zones found. Try 'Himalayan', 'Deccan', or 'Western Ghats'.";
        response = { type: "none", data: [] };
      }
    } else if (intent === "endangered") {
      const species = await Species.find({
        conservationStatus: { $in: ["Endangered", "Critically Endangered"] },
      })
        .limit(5)
        .select("name scientificName conservationStatus population type image");

      message = `Here are ${species.length} endangered species in our database.`;
      response = { type: "species", data: species };
    } else {
      // Default: search species
      const species = keywords.length > 0
        ? await Species.find({
            $or: [{ name: regex }, { scientificName: regex }, { description: regex }],
          }).limit(3)
        : [];

      if (species.length > 0) {
        const s = species[0];
        message = `I found information about ${s.name} (${s.scientificName}). It is a ${s.type} found in the ${s.zone} zone. Conservation status: ${s.conservationStatus}. Population: ~${s.population.toLocaleString()}.`;
        response = { type: "species", data: species };
      } else {
        message = "I couldn't find specific information for your query. Try searching for species like 'Tiger', 'Elephant', or 'Snow Leopard'.";
        response = { type: "none", data: [] };
      }
    }

    res.status(200).json({
      success: true,
      query,
      message,
      ...response,
    });
  } catch (error) {
    next(error);
  }
};
