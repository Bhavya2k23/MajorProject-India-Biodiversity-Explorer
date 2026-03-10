const Zone = require("../models/Zone");
const Species = require("../models/Species");

// @desc    Get all zones
// @route   GET /api/zones
// @access  Public
exports.getAllZones = async (req, res, next) => {
  try {
    const zones = await Zone.find().sort({ zoneName: 1 });
    res.status(200).json({ success: true, count: zones.length, data: zones });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single zone with species
// @route   GET /api/zones/:id
// @access  Public
exports.getZoneById = async (req, res, next) => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) return res.status(404).json({ success: false, message: "Zone not found" });

    const species = await Species.find({ zone: zone.zoneName }).select(
      "name scientificName type conservationStatus image ecosystem"
    );

    res.status(200).json({ success: true, data: { ...zone.toObject(), species } });
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
    res.status(201).json({ success: true, message: "Zone created", data: zone });
  } catch (error) {
    next(error);
  }
};

// @desc    Update zone
// @route   PUT /api/zones/:id
// @access  Admin
exports.updateZone = async (req, res, next) => {
  try {
    const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!zone) return res.status(404).json({ success: false, message: "Zone not found" });
    res.status(200).json({ success: true, data: zone });
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
    if (!zone) return res.status(404).json({ success: false, message: "Zone not found" });
    res.status(200).json({ success: true, message: "Zone deleted" });
  } catch (error) {
    next(error);
  }
};
