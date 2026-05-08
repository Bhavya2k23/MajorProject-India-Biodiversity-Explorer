const Species = require("../models/Species");
const { getSpeciesIcon } = require("../utils/getSpeciesIcon");
const { sendResponse } = require("../utils/apiResponse");
const recommendationService = require("../services/recommendationService");

// ─── Helper: attach icon to species object ────────────────────────
const withIcon = (species) => {
  const obj = typeof species.toObject === "function" ? species.toObject() : species;
  obj.icon = getSpeciesIcon(obj.name, obj.type, obj.scientificName);
  return obj;
};

// @desc    Get all species with filtering, sorting, pagination
// @route   GET /api/species   |   GET /api/animals
// @access  Public
exports.getAllSpecies = async (req, res, next) => {
  try {
    const {
      zone,
      ecosystem,
      type,
      conservationStatus,
      sort,
      page = 1,
      limit = 20,
      search,
    } = req.query;

    const filter = {};
    if (zone)               filter.zone = { $regex: zone, $options: "i" };
    if (ecosystem)          filter.$or = [{ ecosystem: { $regex: ecosystem, $options: "i" } }, { ecosystems: { $regex: ecosystem, $options: "i" } }];
    if (type)               filter.type = type;
    if (conservationStatus) filter.conservationStatus = conservationStatus;
    if (search) {
      filter.$or = [
        { name:           { $regex: search, $options: "i" } },
        { scientificName: { $regex: search, $options: "i" } },
        { description:    { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions = {
      name:        { name: 1 },
      "-name":     { name: -1 },
      population:  { population: 1 },
      "-population": { population: -1 },
      newest:      { createdAt: -1 },
    };
    const sortBy = sortOptions[sort] || { name: 1 };

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Species.countDocuments(filter);

    const speciesList = await Species.find(filter)
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const data = speciesList.map(s => ({
      ...s,
      icon: getSpeciesIcon(s.name, s.type, s.scientificName),
    }));

    sendResponse(res, 200, {
      total,
      page:  parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      count: data.length,
      data,
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
    const species = await Species.findById(req.params.id).lean();
    if (!species) {
      return res.status(404).json({ success: false, message: "Species not found" });
    }

    sendResponse(res, 200, {
        ...species,
        icon: getSpeciesIcon(species.name, species.type, species.scientificName),
      });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new species
// @route   POST /api/species
// @access  Admin
exports.createSpecies = async (req, res, next) => {
  try {
    const speciesData = { ...req.body };

    // ── Uniqueness pre-check (duplicate prevention) ──────────
    const rawName = (speciesData.name || "").trim();
    if (!rawName) {
      return res.status(400).json({ success: false, message: "Species name is required." });
    }
    const normalizedName = rawName.toLowerCase().replace(/\s+/g, " ");
    const existing = await Species.findOne({ normalizedName }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Species "${existing.name}" already exists (normalised: "${normalizedName}"). Use the update endpoint to modify it.`,
        existingId: existing._id,
      });
    }

    // Handle images (Unified logic)
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => `/uploads/${file.filename}`);
    } else if (speciesData.imageUrl) {
      images = [speciesData.imageUrl];
    }

    speciesData.images = images;
    if (images.length > 0 && !speciesData.imageUrl) speciesData.imageUrl = images[0];

    // Parse coordinates
    if (speciesData.lat && speciesData.lng) {
      speciesData.coordinates = {
        lat: parseFloat(speciesData.lat),
        lng: parseFloat(speciesData.lng),
        locationName: speciesData.locationName || "",
      };
    }

    const species = await Species.create({
      ...speciesData,
      createdBy: req.user?._id,
    });

    sendResponse(res, 201, withIcon(species), "Species created successfully");
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A species with this name already exists.",
      });
    }
    next(error);
  }
};

// @desc    Update species
// @route   PUT /api/species/:id
// @access  Admin
exports.updateSpecies = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Handle images (Unified logic)
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/${file.filename}`);
      updateData.images   = newImages;
      updateData.imageUrl = newImages[0];
    } else if (updateData.imageUrl && !updateData.images) {
      updateData.images = [updateData.imageUrl];
    }

    // Parse coordinates
    if (updateData.lat !== undefined && updateData.lng !== undefined) {
      updateData.coordinates = {
        lat: parseFloat(updateData.lat),
        lng: parseFloat(updateData.lng),
        locationName: updateData.locationName || "",
      };
    }

    const species = await Species.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!species) {
      return res.status(404).json({ success: false, message: "Species not found" });
    }

    sendResponse(res, 200, {
        ...species,
        icon: getSpeciesIcon(species.name, species.type, species.scientificName),
      }, "Species updated successfully");
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
    sendResponse(res, 200, null, `Species "${species.name}" deleted successfully.`);
  } catch (error) {
    next(error);
  }
};

// @desc    Get species recommendations
// @route   GET /api/species/recommendations/:id
// @access  Public
exports.getRecommendations = async (req, res, next) => {
  try {
    const speciesId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit) || 5, 10);

    let result;
    try {
      result = await recommendationService.getRecommendations(speciesId, { limit });
    } catch (recError) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        metadata: { algorithm: "fallback", error: "Recommendation service unavailable" },
      });
    }

    const recommendations = result.recommendations.map((rec) => ({
      _id:                rec._id,
      name:               rec.name,
      scientificName:     rec.scientificName,
      type:               rec.type,
      conservationStatus: rec.conservationStatus,
      ecosystem:          rec.ecosystem,
      zone:               rec.zone,
      score:              rec.score,
      icon:               getSpeciesIcon(rec.name, rec.type, rec.scientificName),
    }));

    sendResponse(res, 200, recommendations, "Recommendations fetched successfully", true, {
        responseTimeMs: result.metadata?.responseTimeMs || 0,
        algorithm:      result.metadata?.algorithm || "content-based",
      });
  } catch (error) {
    if (error.message === "Species not found") {
      return res.status(404).json({ success: false, message: "Species not found" });
    }
    next(error);
  }
};
