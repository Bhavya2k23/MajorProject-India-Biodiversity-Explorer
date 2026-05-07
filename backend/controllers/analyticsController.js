const Species = require("../models/Species");
const Plant = require("../models/Plant");
const User = require("../models/User");
const Zone = require("../models/Zone");
const Ecosystem = require("../models/Ecosystem");
const { sendResponse } = require("../utils/apiResponse");

// Helper to generate domain specific distributions securely.
const getDomainInsights = async (Model) => {
  const [
    totalCount,
    totalZones,
    endangeredCount,
    totalEcosystems,
    zoneDistribution,
    conservationStatusDist,
    ecosystemDistribution,
  ] = await Promise.all([
    Model.countDocuments(),
    Model.distinct("zone").then((z) => z.length),
    Model.countDocuments({
      conservationStatus: { $in: ["Endangered", "Critically Endangered"] },
    }),
    Model.distinct("ecosystem").then((e) => e.length),

    Model.aggregate([
      { $group: { _id: "$zone", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { zone: "$_id", count: 1, _id: 0 } },
    ]),

    Model.aggregate([
      { $group: { _id: "$conservationStatus", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { status: "$_id", count: 1, _id: 0 } },
    ]),

    Model.aggregate([
      { $group: { _id: "$ecosystem", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { ecosystem: "$_id", count: 1, _id: 0 } },
    ]),
  ]);

  const topZone = zoneDistribution[0]?.zone || "N/A";
  const criticalCount = conservationStatusDist
    .filter((s) => ["Endangered", "Critically Endangered"].includes(s.status))
    .reduce((acc, s) => acc + s.count, 0);
  const topEcosystem = ecosystemDistribution[0]?.ecosystem || "N/A";

  const keyInsights = [
    `The ${topZone} zone hosts the highest diversity in our database`,
    `${criticalCount} species require immediate conservation action`,
    `${topEcosystem} support the largest number of documented species`,
  ];

  return {
    summary: { totalSpecies: totalCount, totalZones, endangeredCount, totalEcosystems },
    zoneDistribution,
    conservationStatusDist,
    ecosystemDistribution,
    keyInsights,
  };
};

exports.getBiodiversityInsights = async (req, res, next) => {
  try {
    const animals = await getDomainInsights(Species);
    const plants = await getDomainInsights(Plant);

    sendResponse(res, 200, { animals, plants });
  } catch (error) {
    next(error);
  }
};

<<<<<<< HEAD
// Helper to generate domain specific distributions securely.
const getDomainInsights = async (Model) => {
  const [
    totalCount,
    totalZones,
    endangeredCount,
    totalEcosystems,
    zoneDistribution,
    conservationStatusDist,
    ecosystemDistribution,
  ] = await Promise.all([
    Model.countDocuments(),
    Model.distinct("zone").then((z) => z.length),
    Model.countDocuments({
      conservationStatus: { $in: ["Endangered", "Critically Endangered"] },
    }),
    Model.distinct("ecosystem").then((e) => e.length),

    Model.aggregate([
      { $group: { _id: "$zone", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { zone: "$_id", count: 1, _id: 0 } },
    ]),

    Model.aggregate([
      { $group: { _id: "$conservationStatus", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { status: "$_id", count: 1, _id: 0 } },
    ]),

    Model.aggregate([
      { $group: { _id: "$ecosystem", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { ecosystem: "$_id", count: 1, _id: 0 } },
    ]),
  ]);

  const topZone = zoneDistribution[0]?.zone || "N/A";
  const criticalCount = conservationStatusDist
    .filter((s) => ["Endangered", "Critically Endangered"].includes(s.status))
    .reduce((acc, s) => acc + s.count, 0);
  const topEcosystem = ecosystemDistribution[0]?.ecosystem || "N/A";

  const keyInsights = [
    `The ${topZone} zone hosts the highest diversity in our database`,
    `${criticalCount} species require immediate conservation action`,
    `${topEcosystem} support the largest number of documented species`,
  ];

  return {
    summary: { totalSpecies: totalCount, totalZones, endangeredCount, totalEcosystems },
    zoneDistribution,
    conservationStatusDist,
    ecosystemDistribution,
    keyInsights,
  };
};

exports.getBiodiversityInsights = async (req, res, next) => {
  try {
    const animals = await getDomainInsights(Species);
    const plants = await getDomainInsights(Plant);

    res.status(200).json({
      success: true,
      data: {
        animals,
        plants
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getDashboardAnalytics = async (req, res, next) => {
  try {
    // Admin dashboard can combine them or stick to animals for now.
    const animalData = await getDomainInsights(Species);
    const totalUsers = await User.countDocuments({ role: "user" });

    res.status(200).json({
      success: true,
      data: {
        ...animalData,
        summary: { ...animalData.summary, totalUsers },
      },
=======
exports.getDashboardAnalytics = async (req, res, next) => {
  try {
    const animalData = await getDomainInsights(Species);
    const totalUsers = await User.countDocuments({ role: "user" });

    sendResponse(res, 200, {
      ...animalData,
      summary: { ...animalData.summary, totalUsers },
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
    });
  } catch (error) {
    next(error);
  }
};

exports.getEcosystemStats = async (req, res, next) => {
  try {
    const stats = await Species.aggregate([
      {
        $group: {
          _id: "$ecosystem",
          totalSpecies: { $sum: 1 },
          avgPopulation: { $avg: "$population" },
          endangeredCount: {
            $sum: {
              $cond: [{ $in: ["$conservationStatus", ["Endangered", "Critically Endangered"]] }, 1, 0],
            },
          },
        },
      },
      { $sort: { totalSpecies: -1 } },
      { $project: { ecosystem: "$_id", totalSpecies: 1, avgPopulation: { $round: ["$avgPopulation", 0] }, endangeredCount: 1, _id: 0 } },
    ]);

    sendResponse(res, 200, stats);
  } catch (error) {
    next(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    sendResponse(res, 200, users, `Fetched ${users.length} users`, true);
  } catch (error) {
    next(error);
  }
};
