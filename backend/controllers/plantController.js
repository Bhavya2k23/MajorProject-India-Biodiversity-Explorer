const Plant = require("../models/Plant");
const { getSpeciesIcon } = require("../utils/getSpeciesIcon");
const { sendResponse } = require("../utils/apiResponse");

// ─── Helper: attach icon to plant object ──────────────────────────
const withIcon = (plant) => {
  const obj = typeof plant.toObject === "function" ? plant.toObject() : plant;
  obj.icon = getSpeciesIcon(obj.name, obj.type || "Plant", obj.scientificName);
  return obj;
};

// @desc    Get all plants with filtering, sorting, pagination
// @route   GET /api/plants
// @access  Public
exports.getAllPlants = async (req, res, next) => {
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
    if (ecosystem)          filter.ecosystem = { $regex: ecosystem, $options: "i" };
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
      name:    { name: 1 },
      "-name": { name: -1 },
      newest:  { createdAt: -1 },
    };
    const sortBy = sortOptions[sort] || { name: 1 };

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Plant.countDocuments(filter);
    const plants = await Plant.find(filter)
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const data = plants.map(p => ({
      ...p,
      icon: getSpeciesIcon(p.name, p.type || "Plant", p.scientificName),
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

// @desc    Get single plant by ID
// @route   GET /api/plants/:id
// @access  Public
exports.getPlantById = async (req, res, next) => {
  try {
    const plant = await Plant.findById(req.params.id).lean();
    if (!plant) {
      return res.status(404).json({ success: false, message: "Plant not found" });
    }

    sendResponse(res, 200, {
        ...plant,
        icon: getSpeciesIcon(plant.name, plant.type || "Plant", plant.scientificName),
      });
  } catch (error) {
    next(error);
  }
};

// @desc    Get plant recommendations
// @route   GET /api/plants/recommendations/:id
// @access  Public
exports.getRecommendations = async (req, res, next) => {
  try {
    const plant = await Plant.findById(req.params.id).lean();
    if (!plant) {
      return res.status(404).json({ success: false, message: "Plant not found" });
    }

    const recommendations = await Plant.find({
      _id: { $ne: plant._id },
      $or: [{ ecosystem: plant.ecosystem }, { zone: plant.zone }],
    })
      .limit(6)
      .select("name scientificName type conservationStatus zone ecosystem")
      .lean();

    sendResponse(res, 200, recommendations.map(r => ({
        ...r,
        icon: getSpeciesIcon(r.name, r.type || "Plant", r.scientificName),
      })), "Recommendations fetched successfully");
  } catch (error) {
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════
// ADMIN CRUD
// ══════════════════════════════════════════════════════════════

exports.getAllPlantsAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = "",
      status = "",
      ecosystem = "",
      zone = "",
    } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name:           { $regex: search, $options: "i" } },
        { scientificName: { $regex: search, $options: "i" } },
      ];
    }
    if (status)    query.conservationStatus = status;
    if (ecosystem) query.ecosystem = { $regex: ecosystem, $options: "i" };
    if (zone)      query.zone      = { $regex: zone, $options: "i" };

    const total  = await Plant.countDocuments(query);
    const plants = await Plant.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    sendResponse(res, 200, plants.map(p => ({ ...p, icon: getSpeciesIcon(p.name, p.type || "Plant", p.scientificName) })), "Plants fetched successfully", true, {
      pagination: {
        total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createPlant = async (req, res) => {
  try {
    const plantData = { ...req.body };

    // ── Uniqueness pre-check (FIX 11: duplicate prevention) ──────────
    const rawName = (plantData.name || "").trim();
    if (!rawName) {
      return res.status(400).json({ success: false, message: "Plant name is required." });
    }
    const normalizedName = rawName.toLowerCase().replace(/\s+/g, " ");
    const existing = await Plant.findOne({ normalizedName }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Plant "${existing.name}" already exists (normalised: "${normalizedName}"). Use the update endpoint to modify it.`,
        existingId: existing._id,
      });
    }

    if (plantData.uses && typeof plantData.uses === "string") {
      plantData.uses = plantData.uses.split(",").map(t => t.trim()).filter(Boolean);
    }
    if (plantData.funFacts && typeof plantData.funFacts === "string") {
      plantData.funFacts = plantData.funFacts.split(",").map(f => f.trim()).filter(Boolean);
    }

    // Handle uploaded images
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => `/uploads/${file.filename}`);
    } else if (plantData.imageUrl) {
      images = [plantData.imageUrl];
    }

    plantData.images = images;
    if (images.length > 0 && !plantData.imageUrl) plantData.imageUrl = images[0];

    if (plantData.lat && plantData.lng) {
      plantData.coordinates = {
        lat: parseFloat(plantData.lat),
        lng: parseFloat(plantData.lng),
        locationName: plantData.locationName || "",
      };
    }

    const plant = await Plant.create(plantData);

    sendResponse(res, 201, withIcon(plant), "Plant created successfully.");
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "A plant with this name already exists." });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updatePlant = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.uses && typeof updateData.uses === "string") {
      updateData.uses = updateData.uses.split(",").map(t => t.trim()).filter(Boolean);
    }
    if (updateData.funFacts && typeof updateData.funFacts === "string") {
      updateData.funFacts = updateData.funFacts.split(",").map(f => f.trim()).filter(Boolean);
    }

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/${file.filename}`);
      updateData.images   = newImages;
      updateData.imageUrl = newImages[0];
    } else if (updateData.imageUrl && !updateData.images) {
      updateData.images = [updateData.imageUrl];
    }

    if (updateData.lat !== undefined && updateData.lng !== undefined) {
      updateData.coordinates = {
        lat: parseFloat(updateData.lat),
        lng: parseFloat(updateData.lng),
        locationName: updateData.locationName || "",
      };
    }

    const plant = await Plant.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).lean();

    if (!plant) {
      return res.status(404).json({ success: false, message: "Plant not found." });
    }

    sendResponse(res, 200, { ...plant, icon: getSpeciesIcon(plant.name, plant.type || "Plant", plant.scientificName) }, "Plant updated successfully.");
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deletePlant = async (req, res) => {
  try {
    const { id }  = req.params;
    const plant   = await Plant.findByIdAndDelete(id);

    if (!plant) {
      return res.status(404).json({ success: false, message: "Plant not found." });
    }

    sendResponse(res, 200, null, `Plant "${plant.name}" deleted successfully.`);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
