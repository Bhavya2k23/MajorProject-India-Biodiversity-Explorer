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
        .select("name scientificName type conservationStatus image zone ecosystem"),

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
