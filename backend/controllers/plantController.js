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