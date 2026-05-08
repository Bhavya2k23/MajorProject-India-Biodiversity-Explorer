const Zone = require("../models/Zone");
const Species = require("../models/Species");
const { sendResponse } = require("../utils/apiResponse");

// @desc    Get all zones
// @route   GET /api/zones
// @access  Public
exports.getAllZones = async (req, res, next) => {
  try {
    const zones = await Zone.find().sort({ zoneName: 1 });

    // Enrich each zone with species count
    const enrichedZones = await Promise.all(
      zones.map(async (zone) => {
        const speciesCount = await Species.countDocuments({
          $or: [
            { zone: { $regex: zone.zoneName, $options: "i" } },
            { zones: { $regex: zone.zoneName, $options: "i" } }
          ],
        });
        return {
          ...zone.toObject(),
          speciesCount,
        };
      })
    );

    sendResponse(res, 200, {
      count: enrichedZones.length,
      data: enrichedZones,
    }, "Zones fetched successfully");
  } catch (error) {
    next(error);
  }
};

// @desc    Get single zone with its species
// @route   GET /api/zones/:id
// @access  Public
exports.getZoneById = async (req, res, next) => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) {
      return res.status(404).json({ success: false, message: "Zone not found" });
    }

    // Fetch species belonging to this zone
    const species = await Species.find({
      $or: [
        { zone: { $regex: zone.zoneName, $options: "i" } },
        { zones: { $regex: zone.zoneName, $options: "i" } }
      ],
    }).select(
      "name scientificName type conservationStatus imageUrl ecosystem population"
    );

    res.status(200).json({
      success: true,
      data: {
        ...zone.toObject(),
        species,
        speciesCount: species.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get zone by name (slug)
// @route   GET /api/zones/name/:name
// @access  Public
exports.getZoneByName = async (req, res, next) => {
  try {
    const zone = await Zone.findOne({
      zoneName: { $regex: req.params.name, $options: "i" },
    });

    if (!zone) {
      return res.status(404).json({ success: false, message: "Zone not found" });
    }

    const species = await Species.find({
      $or: [
        { zone: { $regex: zone.zoneName, $options: "i" } },
        { zones: { $regex: zone.zoneName, $options: "i" } }
      ],
    }).select(
      "name scientificName type conservationStatus imageUrl ecosystem population"
    );

    res.status(200).json({
      success: true,
      data: {
        ...zone.toObject(),
        species,
        speciesCount: species.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create zone
// @route   POST /api/zones
// @access  Admin
exports.createZone = async (req, res, next) => {
  try {
    const zone = await Zone.create(req.body);
    sendResponse(res, 201, zone, "Zone created successfully");
  } catch (error) {
    if (error.code === 11000) {
      return sendResponse(res, 400, null, "Zone with this name already exists.", false);
    }
    next(error);
  }
};

// @desc    Update zone
// @route   PUT /api/zones/:id
// @access  Admin
exports.updateZone = async (req, res, next) => {
  try {
    const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!zone) {
      return res.status(404).json({ success: false, message: "Zone not found" });
    }
    sendResponse(res, 200, zone, "Zone updated successfully");
  } catch (error) {
    next(error);
  }
};

// @desc    Delete zone
// @route   DELETE /api/zones/:id
// @access  Admin
exports.deleteZone = async (req, res, next) => {
  try {
    const zone = await Zone.findByIdAndDelete(req.params.id);
    if (!zone) {
      return res.status(404).json({ success: false, message: "Zone not found" });
    }
    sendResponse(res, 200, null, `Zone "${zone.zoneName}" deleted successfully`);
  } catch (error) {
    next(error);
  }
};