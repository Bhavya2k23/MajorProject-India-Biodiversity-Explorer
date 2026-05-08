const Species = require("../models/Species");
const Plant = require("../models/Plant");
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
    const lower = query.toLowerCase();
    const regex = new RegExp(keywords.join("|"), "i");

    let response = {};
    let message = "";

    if (intent === "ecosystem") {
      const ecosystems = await Ecosystem.find({
        $or: [{ name: regex }, { description: regex }],
      }).limit(50);

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
      }).limit(50);

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
        .limit(50)
        .select("name scientificName conservationStatus population type image");

      message = `Here are ${species.length} endangered species in our database.`;
      response = { type: "species", data: species };
    } else if (intent === "plants" || lower.includes("plant") || lower.includes("tree") || lower.includes("herb") || lower.includes("flower")) {
      const plants = keywords.length > 0
        ? await Plant.find({ $or: [{ name: regex }, { scientificName: regex }, { description: regex }] }).limit(50)
        : await Plant.find({ conservationStatus: { $in: ["Endangered", "Critically Endangered"] } }).limit(50).select("name scientificName conservationStatus type zone ecosystem");

      if (plants.length > 0) {
        const p = plants[0];
        const useStr = p.uses?.slice(0, 2).join("; ") || "ecological significance";
        message = `🌿 **${p.name}** (*${p.scientificName}*) is a ${p.type} found in the ${p.zone} zone (${p.ecosystem} ecosystem). Conservation status: **${p.conservationStatus}**. Uses: ${useStr}.`;
        response = { type: "plants", data: plants };
      } else {
        message = "No plants found for your query. Try 'Neem', 'Tulsi', 'Sandalwood', or 'Brahma Kamal'.";
        response = { type: "none", data: [] };
      }
    } else {
      // Default: search both species and plants
      const [speciesResults, plantResults] = await Promise.all([
        keywords.length > 0
          ? Species.find({ $or: [{ name: regex }, { scientificName: regex }, { description: regex }] }).limit(50)
          : [],
        keywords.length > 0
          ? Plant.find({ $or: [{ name: regex }, { scientificName: regex }, { description: regex }] }).limit(50)
          : [],
      ]);

      if (speciesResults.length > 0) {
        const s = speciesResults[0];
        message = `🦁 **${s.name}** (*${s.scientificName}*) is a ${s.type} found in the ${s.zone} zone. Conservation status: **${s.conservationStatus}**. Population: ~${(s.population || 0).toLocaleString()}. ${s.threats?.length ? `Key threats: ${s.threats.slice(0, 2).join(", ")}.` : ""}`;
        response = { type: "species", data: speciesResults };
      } else if (plantResults.length > 0) {
        const p = plantResults[0];
        const useStr = p.uses?.slice(0, 2).join("; ") || "ecological significance";
        message = `🌿 **${p.name}** (*${p.scientificName}*) is a ${p.type} in the ${p.zone} zone. Conservation status: **${p.conservationStatus}**. Uses: ${useStr}.`;
        response = { type: "plants", data: plantResults };
      } else {
        message = "I couldn't find specific information for your query. Try searching for animals like 'Tiger', 'Elephant' or plants like 'Neem', 'Tulsi', 'Sandalwood'. You can also ask about 'endangered species' or 'Western Ghats ecosystem'.";
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
