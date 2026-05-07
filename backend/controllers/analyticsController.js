const Species = require("../models/Species");
const Plant = require("../models/Plant");
const User = require("../models/User");
const Zone = require("../models/Zone");
const Ecosystem = require("../models/Ecosystem");

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

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};
