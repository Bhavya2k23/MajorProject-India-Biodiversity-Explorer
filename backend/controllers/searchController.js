const Species = require("../models/Species");
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

    const [species, ecosystems, zones] = await Promise.all([
      Species.find({
        $or: [{ name: regex }, { scientificName: regex }, { description: regex }, { zone: regex }, { ecosystem: regex }],
      })
        .limit(10)
        .select("name scientificName type conservationStatus image images imageUrl zone ecosystem"),

      Ecosystem.find({
        $or: [{ name: regex }, { description: regex }, { zone: regex }],
      })
        .limit(5)
        .select("name description zone image"),

      Zone.find({
        $or: [{ zoneName: regex }, { description: regex }],
      })
        .limit(5)
        .select("zoneName description statesCovered"),
    ]);

    const totalResults = species.length + ecosystems.length + zones.length;

    res.status(200).json({
      success: true,
      query: q,
      totalResults,
      data: { species, ecosystems, zones },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Instant search suggestions (autocomplete) for species names
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

    const [startsWithMatches, containsMatches] = await Promise.all([
      Species.find({ $or: [{ name: startsWithRegex }, { scientificName: startsWithRegex }] })
        .limit(5)
        .select("_id name scientificName conservationStatus"),
      Species.find({
        $or: [{ name: containsRegex }, { scientificName: containsRegex }],
        name: { $not: startsWithRegex }, // exclude already-found starts-with
      })
        .limit(5)
        .select("_id name scientificName conservationStatus"),
    ]);

    // Merge, deduplicate, cap at 8
    const seen = new Set();
    const suggestions = [];
    for (const s of [...startsWithMatches, ...containsMatches]) {
      const id = s._id.toString();
      if (!seen.has(id)) {
        seen.add(id);
        suggestions.push({
          id,
          name: s.name,
          scientificName: s.scientificName,
          conservationStatus: s.conservationStatus,
        });
      }
      if (suggestions.length >= 8) break;
    }

    res.json({ success: true, query, suggestions });
  } catch (error) {
    next(error);
  }
};
