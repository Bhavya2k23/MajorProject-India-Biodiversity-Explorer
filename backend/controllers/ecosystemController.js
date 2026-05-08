const Ecosystem = require("../models/Ecosystem");
const Species = require("../models/Species");
const Plant = require("../models/Plant");
const { sendResponse } = require("../utils/apiResponse");

// @desc    Get all ecosystems
// @route   GET /api/ecosystems
// @access  Public
exports.getAllEcosystems = async (req, res, next) => {
  try {
    const { zone } = req.query;
    const filter = {};
    if (zone) filter.zone = { $regex: zone, $options: "i" };

    const ecosystems = await Ecosystem.find(filter).sort({ name: 1 });

    // Enrich with counts for each ecosystem
    const enriched = await Promise.all(
      ecosystems.map(async (eco) => {
        const [animalCount, plantCount] = await Promise.all([
          Species.countDocuments({ $or: [{ ecosystem: { $regex: eco.name, $options: "i" } }, { ecosystems: { $regex: eco.name, $options: "i" } }] }),
          Plant.countDocuments({ $or: [{ ecosystem: { $regex: eco.name, $options: "i" } }, { ecosystems: { $regex: eco.name, $options: "i" } }] }),
        ]);
        return {
          ...eco.toObject(),
          animalCount,
          plantCount,
          totalSpecies: animalCount + plantCount,
        };
      })
    );

    sendResponse(res, 200, {
      count: enriched.length,
      data: enriched,
    }, "Ecosystems fetched successfully");
  } catch (error) {
    next(error);
  }
};

// @desc    Get single ecosystem with its species and plants
// @route   GET /api/ecosystems/:id
// @access  Public
exports.getEcosystemById = async (req, res, next) => {
  try {
    const ecosystem = await Ecosystem.findById(req.params.id);
    if (!ecosystem) {
      return res.status(404).json({ success: false, message: "Ecosystem not found" });
    }

    // Fetch both animals and plants in this ecosystem
    const [species, plants] = await Promise.all([
      Species.find({ $or: [{ ecosystem: { $regex: ecosystem.name, $options: "i" } }, { ecosystems: { $regex: ecosystem.name, $options: "i" } }] }).select(
        "name scientificName type conservationStatus imageUrl population zone"
      ),
      Plant.find({ $or: [{ ecosystem: { $regex: ecosystem.name, $options: "i" } }, { ecosystems: { $regex: ecosystem.name, $options: "i" } }] }).select(
        "name scientificName type conservationStatus imageUrl zone"
      ),
    ]);

    res.status(200).json({
      success: true,
      message: "Ecosystem fetched successfully",
      data: {
        ...ecosystem.toObject(),
        species,
        plants,
        animalCount: species.length,
        plantCount: plants.length,
        totalSpecies: species.length + plants.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ecosystem by name
// @route   GET /api/ecosystems/name/:name
// @access  Public
exports.getEcosystemByName = async (req, res, next) => {
  try {
    const ecosystem = await Ecosystem.findOne({
      name: { $regex: req.params.name, $options: "i" },
    });

    if (!ecosystem) {
      return res.status(404).json({ success: false, message: "Ecosystem not found" });
    }

    const [species, plants] = await Promise.all([
      Species.find({ $or: [{ ecosystem: { $regex: ecosystem.name, $options: "i" } }, { ecosystems: { $regex: ecosystem.name, $options: "i" } }] }).select(
        "name scientificName type conservationStatus imageUrl population zone"
      ),
      Plant.find({ $or: [{ ecosystem: { $regex: ecosystem.name, $options: "i" } }, { ecosystems: { $regex: ecosystem.name, $options: "i" } }] }).select(
        "name scientificName type conservationStatus imageUrl zone"
      ),
    ]);

    res.status(200).json({
      success: true,
      message: "Ecosystem fetched successfully",
      data: {
        ...ecosystem.toObject(),
        species,
        plants,
        animalCount: species.length,
        plantCount: plants.length,
        totalSpecies: species.length + plants.length,
      },
    });
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
    sendResponse(res, 201, ecosystem, "Ecosystem created successfully");
  } catch (error) {
    if (error.code === 11000) {
      return sendResponse(res, 400, null, "Ecosystem with this name already exists.", false);
    }
    next(error);
  }
};

// @desc    Update ecosystem
// @route   PUT /api/ecosystems/:id
// @access  Admin
exports.updateEcosystem = async (req, res, next) => {
  try {
    const ecosystem = await Ecosystem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!ecosystem) {
      return res.status(404).json({ success: false, message: "Ecosystem not found" });
    }
    sendResponse(res, 200, ecosystem, "Ecosystem updated successfully");
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
    if (!ecosystem) {
      return res.status(404).json({ success: false, message: "Ecosystem not found" });
    }
    sendResponse(res, 200, null, `Ecosystem "${ecosystem.name}" deleted successfully`);
  } catch (error) {
    next(error);
  }
};