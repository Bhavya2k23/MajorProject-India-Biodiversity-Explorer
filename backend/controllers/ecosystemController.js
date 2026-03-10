const Ecosystem = require("../models/Ecosystem");
const Species = require("../models/Species");

// @desc    Get all ecosystems
// @route   GET /api/ecosystems
// @access  Public
exports.getAllEcosystems = async (req, res, next) => {
  try {
    const { zone } = req.query;
    const filter = {};
    if (zone) filter.zone = { $regex: zone, $options: "i" };

    const ecosystems = await Ecosystem.find(filter).sort({ name: 1 });
    res.status(200).json({ success: true, count: ecosystems.length, data: ecosystems });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single ecosystem with its species
// @route   GET /api/ecosystems/:id
// @access  Public
exports.getEcosystemById = async (req, res, next) => {
  try {
    const ecosystem = await Ecosystem.findById(req.params.id);
    if (!ecosystem) {
      return res.status(404).json({ success: false, message: "Ecosystem not found" });
    }

    const species = await Species.find({ ecosystem: ecosystem.name }).select(
      "name scientificName type conservationStatus image population"
    );

    res.status(200).json({ success: true, data: { ...ecosystem.toObject(), species } });
  } catch (error) {
    next(error);
  }
};

// @desc    Create ecosystem
// @route   POST /api/ecosystems
// @access  Admin
exports.createEcosystem = async (req, res, next) => {
  try {
    const ecosystem = await Ecosystem.create(req.body);
    res.status(201).json({ success: true, message: "Ecosystem created", data: ecosystem });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ecosystem
// @route   PUT /api/ecosystems/:id
// @access  Admin
exports.updateEcosystem = async (req, res, next) => {
  try {
    const ecosystem = await Ecosystem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!ecosystem) return res.status(404).json({ success: false, message: "Ecosystem not found" });
    res.status(200).json({ success: true, data: ecosystem });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete ecosystem
// @route   DELETE /api/ecosystems/:id
// @access  Admin
exports.deleteEcosystem = async (req, res, next) => {
  try {
    const ecosystem = await Ecosystem.findByIdAndDelete(req.params.id);
    if (!ecosystem) return res.status(404).json({ success: false, message: "Ecosystem not found" });
    res.status(200).json({ success: true, message: "Ecosystem deleted" });
  } catch (error) {
    next(error);
  }
};
