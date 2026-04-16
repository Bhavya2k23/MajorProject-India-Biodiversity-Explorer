const Plant = require("../models/Plant");
const { getSpeciesImage, validateImageUrl } = require("../services/speciesImageService");

// ─── Image Validation & Enrichment Helper ───────────────────────────────────
const validateAndFixImageUrl = async (plant, skipValidation = false) => {
  try {
    if (!plant.imageUrl || plant.imageUrl.trim() === "") {
      const freshImage = await getSpeciesImage(plant.name, plant.scientificName, plant.type, false);
      if (freshImage) {
        plant.imageUrl = freshImage.url;
        plant.images = [freshImage.url];
        await plant.save();
      }
      return;
    }

    if (skipValidation) return;

    const isValid = await validateImageUrl(plant.imageUrl, 3000);
    if (!isValid) {
      console.log(`[PlantController] Image URL invalid for ${plant.name}, fetching fresh image...`);
      const freshImage = await getSpeciesImage(plant.name, plant.scientificName, plant.type, false);
      if (freshImage) {
        plant.imageUrl = freshImage.url;
        plant.images = [freshImage.url];
        await plant.save();
      }
    }
  } catch (error) {
    console.warn(`[PlantController] Image validation error for ${plant?.name}:`, error.message);
  }
};

// ─── Background image refresh for list endpoints ─────────────────────────────
const refreshPlantImageInBackground = (plant) => {
  setImmediate(async () => {
    try {
      if (!plant.imageUrl || plant.imageUrl.trim() === "" || plant.imageUrl.includes("upload.wikimedia.org")) {
        const freshImage = await getSpeciesImage(plant.name, plant.scientificName, plant.type, false);
        if (freshImage) {
          await Plant.findByIdAndUpdate(plant._id, {
            imageUrl: freshImage.url,
            images: [freshImage.url],
          });
        }
        return;
      }
      const isValid = await validateImageUrl(plant.imageUrl, 3000);
      if (!isValid) {
        const freshImage = await getSpeciesImage(plant.name, plant.scientificName, plant.type, false);
        if (freshImage) {
          await Plant.findByIdAndUpdate(plant._id, {
            imageUrl: freshImage.url,
            images: [freshImage.url],
          });
        }
      }
    } catch (error) {
      console.warn(`[PlantController] Background image refresh failed for ${plant?.name}:`, error.message);
    }
  });
};

exports.getAllPlants = async (req, res, next) => {
  try {
    const { zone, ecosystem, type, conservationStatus, sort, page = 1, limit = 20, search } = req.query;

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
      newest: { createdAt: -1 },
    };
    const sortBy = sortOptions[sort] || { createdAt: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Plant.countDocuments(filter);
    const plants = await Plant.find(filter).sort(sortBy).skip(skip).limit(parseInt(limit));

    // Trigger background image refresh for plants with missing/invalid images
    plants.forEach(p => {
      if (!p.imageUrl || p.imageUrl.trim() === "" || p.imageUrl.includes("upload.wikimedia.org")) {
        refreshPlantImageInBackground(p);
      }
    });

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      count: plants.length,
      data: plants,
    });
  } catch (error) {
    next(error);
  }
};

exports.getPlantById = async (req, res, next) => {
  try {
    const plant = await Plant.findById(req.params.id);
    if (!plant) {
      return res.status(404).json({ success: false, message: "Plant not found" });
    }

    // Eagerly validate and fix image for detail view
    await validateAndFixImageUrl(plant, false);

    res.status(200).json({ success: true, data: plant });
  } catch (error) {
    next(error);
  }
};

exports.getRecommendations = async (req, res, next) => {
  try {
    const plant = await Plant.findById(req.params.id);
    if (!plant) {
      return res.status(404).json({ success: false, message: "Plant not found" });
    }

    const recommendations = await Plant.find({
      _id: { $ne: plant._id },
      $or: [
        { ecosystem: plant.ecosystem },
        { zone: plant.zone },
      ],
    })
      .limit(6)
      .select("name scientificName type conservationStatus imageUrl images zone ecosystem");

    // Validate and refresh recommendation images
    await Promise.all(recommendations.map(async (rec) => {
      if (rec.imageUrl) {
        const isValid = await validateImageUrl(rec.imageUrl, 3000);
        if (!isValid) {
          const freshImage = await getSpeciesImage(rec.name, rec.scientificName, rec.type, false);
          if (freshImage) {
            Plant.findByIdAndUpdate(rec._id, {
              imageUrl: freshImage.url,
              images: [freshImage.url],
            }).catch(() => {});
            rec.imageUrl = freshImage.url;
            rec.images = [freshImage.url];
          }
        }
      }
    }));

    res.status(200).json({ success: true, count: recommendations.length, data: recommendations });
  } catch (error) {
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════
// ADMIN CRUD FOR PLANTS
// ══════════════════════════════════════════════════════════════

exports.getAllPlantsAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      status = '',
      ecosystem = '',
      zone = '',
    } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { scientificName: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query.conservationStatus = status;
    if (ecosystem) query.ecosystem = { $regex: ecosystem, $options: 'i' };
    if (zone) query.zone = { $regex: zone, $options: 'i' };

    const total = await Plant.countDocuments(query);
    const plants = await Plant.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: plants,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createPlant = async (req, res) => {
  try {
    const plantData = req.body;

    // Handle array fields that might arrive as comma-separated strings
    if (plantData.uses && typeof plantData.uses === 'string') {
      plantData.uses = plantData.uses.split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (plantData.funFacts && typeof plantData.funFacts === 'string') {
      plantData.funFacts = plantData.funFacts.split(',').map((f) => f.trim()).filter(Boolean);
    }

    // Process uploaded images
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => `/uploads/${file.filename}`);
    } else if (plantData.imageUrl) {
      images = [plantData.imageUrl];
    }
    plantData.images = images;
    if (images.length > 0) {
      plantData.imageUrl = images[0];
    }

    // Handle coordinates
    if (plantData.lat && plantData.lng) {
      plantData.coordinates = {
        lat: parseFloat(plantData.lat),
        lng: parseFloat(plantData.lng),
        locationName: plantData.locationName || '',
      };
    }

    const plant = new Plant(plantData);
    await plant.save();

    res.status(201).json({
      success: true,
      message: 'Plant created successfully.',
      data: plant,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Plant with this name already exists.',
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updatePlant = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.uses && typeof updateData.uses === 'string') {
      updateData.uses = updateData.uses.split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (updateData.funFacts && typeof updateData.funFacts === 'string') {
      updateData.funFacts = updateData.funFacts.split(',').map((f) => f.trim()).filter(Boolean);
    }

    // Process new uploaded images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => `/uploads/${file.filename}`);
      updateData.images = newImages;
      updateData.imageUrl = newImages[0];
    } else if (updateData.imageUrl && !updateData.images) {
      updateData.images = [updateData.imageUrl];
    }

    // Handle coordinates update
    if (updateData.lat !== undefined && updateData.lng !== undefined) {
      updateData.coordinates = {
        lat: parseFloat(updateData.lat),
        lng: parseFloat(updateData.lng),
        locationName: updateData.locationName || '',
      };
    }

    const plant = await Plant.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!plant) {
      return res.status(404).json({ success: false, message: 'Plant not found.' });
    }

    res.json({ success: true, message: 'Plant updated successfully.', data: plant });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deletePlant = async (req, res) => {
  try {
    const { id } = req.params;
    const plant = await Plant.findByIdAndDelete(id);

    if (!plant) {
      return res.status(404).json({ success: false, message: 'Plant not found.' });
    }

    res.json({ success: true, message: `Plant "${plant.name}" deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};