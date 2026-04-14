const Species = require("../models/Species");
const recommendationService = require("../services/recommendationService");

// @desc    Get all species with filtering, sorting, pagination
// @route   GET /api/species
// @access  Public
exports.getAllSpecies = async (req, res, next) => {
  try {
    const { zone, ecosystem, type, conservationStatus, sort, page = 1, limit = 500, search } = req.query;

    const filter = {};
    if (zone) filter.zone = { $regex: zone, $options: "i" };
    if (ecosystem) filter.ecosystem = { $regex: ecosystem, $options: "i" };
    if (type) filter.type = type;
    if (conservationStatus) filter.conservationStatus = conservationStatus;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { scientificName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions = {
      name: { name: 1 },
      "-name": { name: -1 },
      population: { population: 1 },
      "-population": { population: -1 },
      newest: { createdAt: -1 },
    };
    const sortBy = sortOptions[sort] || { createdAt: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Species.countDocuments(filter);
    const species = await Species.find(filter).sort(sortBy).skip(skip).limit(parseInt(limit));

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      count: species.length,
      data: species,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single species by ID
// @route   GET /api/species/:id
// @access  Public
exports.getSpeciesById = async (req, res, next) => {
  try {
    const species = await Species.findById(req.params.id);
    if (!species) {
      return res.status(404).json({ success: false, message: "Species not found" });
    }
    res.status(200).json({ success: true, data: species });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new species
// @route   POST /api/species
// @access  Admin
exports.createSpecies = async (req, res, next) => {
  try {
    const species = await Species.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, message: "Species created successfully", data: species });
  } catch (error) {
    next(error);
  }
};

// @desc    Update species
// @route   PUT /api/species/:id
// @access  Admin
exports.updateSpecies = async (req, res, next) => {
  try {
    const species = await Species.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!species) {
      return res.status(404).json({ success: false, message: "Species not found" });
    }
    res.status(200).json({ success: true, message: "Species updated successfully", data: species });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete species
// @route   DELETE /api/species/:id
// @access  Admin
exports.deleteSpecies = async (req, res, next) => {
  try {
    const species = await Species.findByIdAndDelete(req.params.id);
    if (!species) {
      return res.status(404).json({ success: false, message: "Species not found" });
    }
    res.status(200).json({ success: true, message: "Species deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Get species recommendations based on similar ecosystem/zone/status
// @route   GET /api/species/recommendations/:id
// @access  Public
exports.getRecommendations = async (req, res, next) => {
  try {
    const speciesId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit) || 5, 10);

    const result = await recommendationService.getRecommendations(speciesId, { limit });

    const recommendations = result.recommendations.map(rec => ({
      _id: rec._id,
      name: rec.name,
      scientificName: rec.scientificName,
      type: rec.type,
      conservationStatus: rec.conservationStatus,
      image: rec.image,
      ecosystem: rec.ecosystem,
      zone: rec.zone,
      score: rec.score,
    }));

    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations,
      metadata: {
        responseTimeMs: result.metadata.responseTimeMs,
        algorithm: result.metadata.algorithm,
      },
    });
  } catch (error) {
    if (error.message === "Species not found") {
      return res.status(404).json({ success: false, message: "Species not found" });
    }
    next(error);
  }
};
