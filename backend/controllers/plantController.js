const Plant = require("../models/Plant");

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

    res.status(200).json({ success: true, count: recommendations.length, data: recommendations });
  } catch (error) {
    next(error);
  }
};
