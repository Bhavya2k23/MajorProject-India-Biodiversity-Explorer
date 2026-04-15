const Species = require("../models/Species");
const recommendationService = require("../services/recommendationService");
const { getSpeciesImage, validateImageUrl } = require("../services/speciesImageService");

// ─── Image Validation & Enrichment Helper ───────────────────────────────────
// Validates imageUrl and fetches fresh image from multi-source fallback if invalid
const validateAndFixImageUrl = async (species, skipValidation = false) => {
  try {
    // If imageUrl is empty, fetch fresh image immediately
    if (!species.imageUrl || species.imageUrl.trim() === "") {
      const freshImage = await getSpeciesImage(species.name, species.scientificName, species.type, false);
      if (freshImage) {
        species.imageUrl = freshImage.url;
        species.images = [freshImage.url];
        await species.save();
      }
      return;
    }

    // Optionally skip HEAD validation for performance (skipValidation=true means we're in a list endpoint)
    if (skipValidation) return;

    // Validate existing imageUrl with a quick HEAD request
    const isValid = await validateImageUrl(species.imageUrl, 3000);
    if (!isValid) {
      console.log(`[SpeciesController] Image URL invalid for ${species.name}, fetching fresh image...`);
      const freshImage = await getSpeciesImage(species.name, species.scientificName, species.type, false);
      if (freshImage) {
        species.imageUrl = freshImage.url;
        species.images = [freshImage.url];
        await species.save();
      }
    }
  } catch (error) {
    // Non-critical: log but don't fail the request
    console.warn(`[SpeciesController] Image validation error for ${species?.name}:`, error.message);
  }
};

// ─── Background image refresh for list endpoints ─────────────────────────────
// Updates species images asynchronously after response is sent
const refreshSpeciesImageInBackground = (species) => {
  // Fire and forget - don't await
  setImmediate(async () => {
    try {
      if (!species.imageUrl || species.imageUrl.trim() === "") {
        const freshImage = await getSpeciesImage(species.name, species.scientificName, species.type, false);
        if (freshImage) {
          await Species.findByIdAndUpdate(species._id, {
            imageUrl: freshImage.url,
            images: [freshImage.url],
          });
        }
        return;
      }
      // Check if image is valid
      const isValid = await validateImageUrl(species.imageUrl, 3000);
      if (!isValid) {
        const freshImage = await getSpeciesImage(species.name, species.scientificName, species.type, false);
        if (freshImage) {
          await Species.findByIdAndUpdate(species._id, {
            imageUrl: freshImage.url,
            images: [freshImage.url],
          });
        }
      }
    } catch (error) {
      console.warn(`[SpeciesController] Background image refresh failed for ${species?.name}:`, error.message);
    }
  });
};

// @desc    Get all species with filtering, sorting, pagination
// @route   GET /api/species
// @access  Public
exports.getAllSpecies = async (req, res, next) => {
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
      population: { population: 1 },
      "-population": { population: -1 },
      newest: { createdAt: -1 },
    };
    const sortBy = sortOptions[sort] || { createdAt: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Species.countDocuments(filter);
    const species = await Species.find(filter).sort(sortBy).skip(skip).limit(parseInt(limit));

    // Trigger background image refresh for species with missing/invalid images
    species.forEach(s => {
      if (!s.imageUrl || s.imageUrl.trim() === "" || s.imageUrl.includes("upload.wikimedia.org")) {
        refreshSpeciesImageInBackground(s);
      }
    });

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

    // Eagerly validate and fix image for detail view (single species, can afford small delay)
    await validateAndFixImageUrl(species, false);

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

    // Validate and refresh recommendation images (small number, can do synchronously)
    const recommendations = await Promise.all(result.recommendations.map(async (rec) => {
      // Check if image URL is valid, refresh if not
      if (rec.image) {
        const isValid = await validateImageUrl(rec.image, 3000);
        if (!isValid) {
          const freshImage = await getSpeciesImage(rec.name, rec.scientificName, rec.type, false);
          if (freshImage) {
            // Update MongoDB in background
            Species.findByIdAndUpdate(rec._id, {
              imageUrl: freshImage.url,
              images: [freshImage.url],
            }).catch(() => {}); // Fire and forget
            rec.image = freshImage.url;
          }
        }
      }

      return {
        _id: rec._id,
        name: rec.name,
        scientificName: rec.scientificName,
        type: rec.type,
        conservationStatus: rec.conservationStatus,
        imageUrl: rec.image,
        ecosystem: rec.ecosystem,
        zone: rec.zone,
        score: rec.score,
      };
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
