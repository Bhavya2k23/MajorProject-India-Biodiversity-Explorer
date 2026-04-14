
const Species = require("../models/Species");
const Plant = require("../models/Plant");
const Ecosystem = require("../models/Ecosystem");
const Zone = require("../models/Zone");

// @desc    Global smart search across species, ecosystems, zones
// @route   GET /api/search?q=keyword
// @access  Public
exports.globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Search query must be at least 2 characters" });
    }

    const regex = new RegExp(q.trim(), "i");

    const [species, plants, ecosystems, zones] = await Promise.all([
      Species.find({
        $or: [{ name: regex }, { scientificName: regex }, { description: regex }, { zone: regex }, { ecosystem: regex }],
      })
        .limit(100)
        .select("name scientificName type conservationStatus image images imageUrl zone ecosystem"),

      Plant.find({
        $or: [{ name: regex }, { scientificName: regex }, { description: regex }, { zone: regex }, { ecosystem: regex }],
      })
        .limit(100)
        .select("name scientificName type conservationStatus image images imageUrl zone ecosystem"),

      Ecosystem.find({
        $or: [{ name: regex }, { description: regex }, { zone: regex }],
      })
        .limit(50)
        .select("name description zone image"),

      Zone.find({
        $or: [{ zoneName: regex }, { description: regex }],
      })
        .limit(50)
        .select("zoneName description statesCovered"),
    ]);

    const totalResults = species.length + plants.length + ecosystems.length + zones.length;

    res.status(200).json({
      success: true,
      query: q,
      totalResults,
      data: { species, plants, ecosystems, zones },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Instant search suggestions (autocomplete) for species names (animals + plants)
// @route   GET /api/search/suggestions?q=keyword
// @access  Public
exports.getSearchSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json({ success: true, suggestions: [] });
    }

    const query = q.trim();

    // Primary: starts-with match on name (most relevant for autocomplete)
    const startsWithRegex = new RegExp(`^${query}`, "i");
    // Secondary: contains match for broader results
    const containsRegex   = new RegExp(query, "i");

    // Search both Species (animals) and Plant models
    const [animalStartsWith, animalContains, plantStartsWith, plantContains] = await Promise.all([
      Species.find({ $or: [{ name: startsWithRegex }, { scientificName: startsWithRegex }] })
        .limit(20)
        .select("_id name scientificName conservationStatus"),
      Species.find({
        $or: [{ name: containsRegex }, { scientificName: containsRegex }],
        name: { $not: startsWithRegex }, // exclude already-found starts-with
      })
        .limit(20)
        .select("_id name scientificName conservationStatus"),
      Plant.find({ $or: [{ name: startsWithRegex }, { scientificName: startsWithRegex }] })
        .limit(20)
        .select("_id name scientificName conservationStatus"),
      Plant.find({
        $or: [{ name: containsRegex }, { scientificName: containsRegex }],
        name: { $not: startsWithRegex }, // exclude already-found starts-with
      })
        .limit(20)
        .select("_id name scientificName conservationStatus"),
    ]);

    // Merge, deduplicate, cap at 8
    const seen = new Set();
    const suggestions = [];

    // Helper to add suggestion
    const addSuggestion = (item, source) => {
      const id = `${source}-${item._id.toString()}`;
      if (!seen.has(id)) {
        seen.add(id);
        suggestions.push({
          id: item._id.toString(),
          name: item.name,
          scientificName: item.scientificName,
          conservationStatus: item.conservationStatus,
          source, // 'animal' or 'plant'
        });
      }
    };

    // Add starts-with matches first (higher priority)
    [...animalStartsWith, ...plantStartsWith].forEach(s => addSuggestion(s, animalStartsWith.includes(s) ? 'animal' : 'plant'));
    // Add contains matches
    [...animalContains, ...plantContains].forEach(s => addSuggestion(s, animalContains.includes(s) ? 'animal' : 'plant'));

    res.json({ success: true, query, suggestions: suggestions.slice(0, 8) });
  } catch (error) {
    next(error);
  }
};
