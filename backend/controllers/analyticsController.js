const Species = require("../models/Species");
const User = require("../models/User");
const Zone = require("../models/Zone");
const Ecosystem = require("../models/Ecosystem");

// @desc    Get full analytics dashboard data
// @route   GET /api/analytics
// @access  Admin
exports.getDashboardAnalytics = async (req, res, next) => {
  try {
    const [
      totalSpecies,
      endangeredCount,
      totalUsers,
      totalZones,
      totalEcosystems,
      zoneDistribution,
      conservationStatusDist,
      typeDistribution,
      recentSpecies,
    ] = await Promise.all([
      Species.countDocuments(),
      Species.countDocuments({ conservationStatus: { $in: ["Endangered", "Critically Endangered"] } }),
      User.countDocuments({ role: "user" }),
      Zone.countDocuments(),
      Ecosystem.countDocuments(),

      // Zone-wise species count
      Species.aggregate([
        { $group: { _id: "$zone", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { zone: "$_id", count: 1, _id: 0 } },
      ]),

      // Conservation status distribution
      Species.aggregate([
        { $group: { _id: "$conservationStatus", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { status: "$_id", count: 1, _id: 0 } },
      ]),

      // Type distribution
      Species.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { type: "$_id", count: 1, _id: 0 } },
      ]),

      // Recently added species
      Species.find().sort({ createdAt: -1 }).limit(5).select("name conservationStatus type createdAt"),
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalSpecies,
          endangeredCount,
          totalUsers,
          totalZones,
          totalEcosystems,
        },
        zoneDistribution,
        conservationStatusDist,
        typeDistribution,
        recentSpecies,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ecosystem statistics
// @route   GET /api/analytics/ecosystems
// @access  Public
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

// @desc    Admin - View all users
// @route   GET /api/analytics/users
// @access  Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};
