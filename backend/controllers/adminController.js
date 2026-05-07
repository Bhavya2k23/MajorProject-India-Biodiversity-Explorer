// ============================================================
// FILE: backend/controllers/adminController.js
//
// FIX APPLIED:
//   BUG — login() fetched the admin from the DB TWICE:
//     1. Admin.findOne(...).select('+password')  → already has password
//     2. Admin.findById(admin._id).select('+password')  → redundant
//   The first query already selected the password field, so the
//   second fetch was an unnecessary extra DB round-trip.
//   REMOVED the redundant second fetch. comparePassword() is now
//   called directly on the result of the first query.
// ============================================================

const jwt          = require('jsonwebtoken');
const Admin        = require('../models/Admin');
const Species      = require('../models/Species');
<<<<<<< HEAD
const Ecosystem    = require('../models/Ecosystem');
const Zone         = require('../models/Zone');
const QuizQuestion = require('../models/QuizQuestion');
=======
const Plant        = require('../models/Plant');
const Ecosystem    = require('../models/Ecosystem');
const Zone         = require('../models/Zone');
const QuizQuestion = require('../models/QuizQuestion');
const { sendResponse } = require('../utils/apiResponse');
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d

const JWT_SECRET = process.env.JWT_SECRET || 'biodiversity_admin_jwt_secret_2024';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

// ─── Helper ────────────────────────────────────────────────────
const generateToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.',
      });
=======
    sendResponse(res, 400, null, 'Username and password are required.', false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
    }

    // Allow login with username OR email.
    // .select('+password') is needed because toJSON() strips it —
    // this single query is sufficient; no second fetch required.
    const admin = await Admin.findOne({
      $or: [
        { username: username.trim() },
        { email: username.trim().toLowerCase() },
      ],
    }).select('+password');

    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // FIX: use admin directly — password is already on this document
    // (previously a second Admin.findById().select('+password') was
    //  called here, which was a redundant extra DB round-trip)
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Update last login timestamp
    await Admin.findByIdAndUpdate(admin._id, { lastLogin: new Date() });

    const token = generateToken(admin._id);

    // Return admin info without password (toJSON removes it automatically)
<<<<<<< HEAD
    res.json({
      success: true,
      message: 'Login successful.',
=======
    sendResponse(res, 200, {
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar,
      },
<<<<<<< HEAD
    });
=======
    }, 'Login successful.');
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

exports.getProfile = async (req, res) => {
<<<<<<< HEAD
  res.json({ success: true, admin: req.admin });
=======
  sendResponse(res, 200, { admin: req.admin }, "Admin profile fetched successfully");
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
};

exports.seedInitialAdmin = async (req, res) => {
  try {
    const exists = await Admin.findOne({ username: 'admin' });
    if (exists) {
<<<<<<< HEAD
      return res.json({ success: false, message: 'Admin already exists. Use login.' });
=======
      return sendResponse(res, 200, null, 'Admin already exists. Use login.', false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
    }

    await Admin.create({
      username: 'admin',
      email: 'admin@biodiversity.in',
      password: 'Admin@123',
      role: 'superadmin',
    });

<<<<<<< HEAD
    res.status(201).json({
      success: true,
      message: 'Superadmin created successfully.',
=======
    sendResponse(res, 201, {
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
      credentials: {
        username: 'admin',
        password: 'Admin@123',
        note: 'Change this password after your first login!',
      },
<<<<<<< HEAD
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
=======
    }, 'Superadmin created successfully.');
  } catch (error) {
    sendResponse(res, 500, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

// ══════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ══════════════════════════════════════════════════════════════

exports.getDashboardStats = async (req, res) => {
  try {
<<<<<<< HEAD
=======
    const { zone, ecosystem, conservationStatus, domain = 'all' } = req.query;

    // Build filter for species queries
    const speciesFilter = {};
    if (zone) speciesFilter.zone = { $regex: zone, $options: 'i' };
    if (ecosystem) speciesFilter.ecosystem = { $regex: ecosystem, $options: 'i' };
    if (conservationStatus) speciesFilter.conservationStatus = conservationStatus;

    // Determine which models to query based on domain
    const includeAnimals = domain === 'all' || domain === 'animals';
    const includePlants = domain === 'all' || domain === 'plants';

    // Get counts and aggregations - wrap each in try/catch for partial failure tolerance
    const safeQuery = async (queryFn, fallback = null) => {
      try {
        return await queryFn();
      } catch (err) {
        console.warn('Dashboard query failed, using fallback:', err.message);
        return fallback;
      }
    };

>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
    const [
      totalSpecies,
      endangeredCount,
      totalEcosystems,
      totalZones,
      totalQuizQuestions,
      speciesByConservation,
      speciesByEcosystem,
      speciesByZone,
      recentSpecies,
<<<<<<< HEAD
    ] = await Promise.all([
      Species.countDocuments(),
      Species.countDocuments({
        conservationStatus: { $in: ['Critically Endangered', 'Endangered', 'Vulnerable'] },
      }),
      Ecosystem.countDocuments(),
      Zone.countDocuments(),
      QuizQuestion.countDocuments(),
      Species.aggregate([
        { $group: { _id: '$conservationStatus', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // ecosystem is stored as a String — group directly on the field value
      Species.aggregate([
        { $group: { _id: { $ifNull: ['$ecosystem', 'Unknown'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      // zone is stored as a String — group directly on the field value
      Species.aggregate([
        { $group: { _id: { $ifNull: ['$zone', 'Unknown'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Species.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name scientificName conservationStatus imageUrl createdAt'),
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalSpecies,
          endangeredCount,
          totalEcosystems,
          totalZones,
          totalQuizQuestions,
        },
        charts: {
          speciesByConservation,
          speciesByEcosystem,
          speciesByZone,
        },
        recentSpecies,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: error.message });
=======
      plantStats,
    ] = await Promise.all([
      // Species (animals) counts and aggregations
      safeQuery(() => includeAnimals ? Species.countDocuments(speciesFilter) : 0, 0),
      safeQuery(() => includeAnimals ? Species.countDocuments({
        ...speciesFilter,
        conservationStatus: { $in: ['Critically Endangered', 'Endangered', 'Vulnerable'] },
      }) : 0, 0),
      safeQuery(() => includeAnimals ? Species.distinct('ecosystem', speciesFilter).then(e => e.length) : 0, 0),
      safeQuery(() => includeAnimals ? Species.distinct('zone', speciesFilter).then(z => z.length) : 0, 0),
      safeQuery(() => QuizQuestion.countDocuments(), 0),
      safeQuery(() => includeAnimals ? Species.aggregate([
        { $match: Object.keys(speciesFilter).length > 0 ? speciesFilter : {} },
        { $group: { _id: '$conservationStatus', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]) : [], []),
      safeQuery(() => includeAnimals ? Species.aggregate([
        { $match: Object.keys(speciesFilter).length > 0 ? speciesFilter : {} },
        { $group: { _id: { $ifNull: ['$ecosystem', 'Unknown'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]) : [], []),
      safeQuery(() => includeAnimals ? Species.aggregate([
        { $match: Object.keys(speciesFilter).length > 0 ? speciesFilter : {} },
        { $group: { _id: { $ifNull: ['$zone', 'Unknown'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]) : [], []),
      safeQuery(() => includeAnimals ? Species.find(Object.keys(speciesFilter).length > 0 ? speciesFilter : {})
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name scientificName conservationStatus imageUrl createdAt') : [], []),
      // Plant counts and aggregations
      safeQuery(() => includePlants ? Plant.countDocuments(speciesFilter) : 0, 0),
    ]);

    // Get plant aggregations if needed
    let plantByConservation = [];
    let plantByEcosystem = [];
    let plantByZone = [];
    if (includePlants) {
      const [pbc, pbe, pbz] = await Promise.all([
        safeQuery(() => Plant.aggregate([
          { $match: Object.keys(speciesFilter).length > 0 ? speciesFilter : {} },
          { $group: { _id: '$conservationStatus', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]), []),
        safeQuery(() => Plant.aggregate([
          { $match: Object.keys(speciesFilter).length > 0 ? speciesFilter : {} },
          { $group: { _id: { $ifNull: ['$ecosystem', 'Unknown'] }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]), []),
        safeQuery(() => Plant.aggregate([
          { $match: Object.keys(speciesFilter).length > 0 ? speciesFilter : {} },
          { $group: { _id: { $ifNull: ['$zone', 'Unknown'] }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]), []),
      ]);
      plantByConservation = pbc;
      plantByEcosystem = pbe;
      plantByZone = pbz;
    }

    // Get unique filter options for dropdowns
    const [availableZones, availableEcosystems, availableStatuses] = await Promise.all([
      safeQuery(() => Species.distinct('zone'), []),
      safeQuery(() => Species.distinct('ecosystem'), []),
      safeQuery(() => Species.aggregate([
        { $group: { _id: '$conservationStatus' } },
        { $sort: { _id: 1 } },
      ]).then(res => res.map(r => r._id)), []),
    ]);

    sendResponse(res, 200, {
      overview: {
        totalSpecies: totalSpecies + plantStats,
        totalAnimals: totalSpecies,
        totalPlants: plantStats,
        endangeredCount,
        totalEcosystems,
        totalZones,
        totalQuizQuestions,
      },
      charts: {
        speciesByConservation,
        plantByConservation,
        speciesByEcosystem,
        plantByEcosystem,
        speciesByZone,
        plantByZone,
      },
      recentSpecies,
      filters: {
        zones: availableZones.sort(),
        ecosystems: availableEcosystems.sort(),
        statuses: availableStatuses,
      },
    }, "Dashboard stats fetched successfully");
  } catch (error) {
    console.error('Dashboard stats error:', error);
    sendResponse(res, 500, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

// ══════════════════════════════════════════════════════════════
// SPECIES MANAGEMENT
// ══════════════════════════════════════════════════════════════

exports.getAllSpeciesAdmin = async (req, res) => {
  try {
    const {
      page = 1,
<<<<<<< HEAD
      limit = 15,
=======
      limit = 100,
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
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
    if (ecosystem) query.ecosystem = ecosystem;
    if (zone) query.zone = zone;

    const total = await Species.countDocuments(query);
    const species = await Species.find(query)
<<<<<<< HEAD
      .populate('ecosystem', 'name type')
      .populate('zone', 'name')
=======
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

<<<<<<< HEAD
    res.json({
      success: true,
=======
    sendResponse(res, 200, {
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
      data: species,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
<<<<<<< HEAD
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
=======
    }, "Admin species list fetched successfully");
  } catch (error) {
    sendResponse(res, 500, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

exports.createSpecies = async (req, res) => {
  try {
    const speciesData = req.body;

<<<<<<< HEAD
=======
    // ── Uniqueness pre-check (FIX 11: duplicate prevention) ──────────
    const rawName = (speciesData.name || '').trim();
    if (!rawName) {
      return res.status(400).json({ success: false, message: 'Species name is required.' });
    }
    const normalizedName = rawName.toLowerCase().replace(/\s+/g, ' ');
    const existing = await Species.findOne({ normalizedName }).lean();
    if (existing) {
      return sendResponse(res, 409, null, `Species "${existing.name}" already exists. Use the update endpoint to modify it.`, false, { existingId: existing._id });
    }

    // Set defaults for required fields that might be missing from frontend form
    if (!speciesData.type) speciesData.type = 'Mammal';
    if (speciesData.population === undefined || speciesData.population === '') {
      speciesData.population = 0;
    } else {
      speciesData.population = parseInt(speciesData.population);
    }
    if (speciesData.habitatLoss === undefined || speciesData.habitatLoss === '') {
      speciesData.habitatLoss = 50;
    } else {
      speciesData.habitatLoss = Math.min(100, Math.max(0, parseInt(speciesData.habitatLoss)));
    }
    if (speciesData.pollutionLevel === undefined || speciesData.pollutionLevel === '') {
      speciesData.pollutionLevel = 50;
    } else {
      speciesData.pollutionLevel = Math.min(100, Math.max(0, parseInt(speciesData.pollutionLevel)));
    }
    if (speciesData.climateRisk === undefined || speciesData.climateRisk === '') {
      speciesData.climateRisk = 50;
    } else {
      speciesData.climateRisk = Math.min(100, Math.max(0, parseInt(speciesData.climateRisk)));
    }

>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
    // Handle array fields that might arrive as comma-separated strings
    if (speciesData.threats && typeof speciesData.threats === 'string') {
      speciesData.threats = speciesData.threats.split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (speciesData.funFacts && typeof speciesData.funFacts === 'string') {
      speciesData.funFacts = speciesData.funFacts.split(',').map((f) => f.trim()).filter(Boolean);
    }
<<<<<<< HEAD
    
=======

>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
    // Process uploaded images
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => `/uploads/${file.filename}`);
    } else if (speciesData.imageUrl) {
<<<<<<< HEAD
      // Fallback to imageUrl if provided
      images = [speciesData.imageUrl];
    }
    speciesData.images = images;
    // Set for backward compatibility
=======
      images = [speciesData.imageUrl];
    }
    speciesData.images = images;
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
    if (images.length > 0) {
      speciesData.image = images[0];
    }

<<<<<<< HEAD
    const species = new Species(speciesData);
    await species.save();

    res.status(201).json({
      success: true,
      message: 'Species created successfully.',
      data: species,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Species with this name already exists.',
      });
    }
    res.status(400).json({ success: false, message: error.message });
=======
    // Handle coordinates
    if (speciesData.lat !== undefined && speciesData.lng !== undefined) {
      speciesData.coordinates = {
        lat: parseFloat(speciesData.lat),
        lng: parseFloat(speciesData.lng),
        locationName: speciesData.locationName || '',
      };
    }

    const species = new Species(speciesData);
    await species.save();

    sendResponse(res, 201, species, 'Species created successfully.');
  } catch (error) {
    if (error.code === 11000) {
      return sendResponse(res, 409, null, 'A species with this name already exists.', false);
    }
    sendResponse(res, 400, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

exports.updateSpecies = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.threats && typeof updateData.threats === 'string') {
      updateData.threats = updateData.threats.split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (updateData.funFacts && typeof updateData.funFacts === 'string') {
      updateData.funFacts = updateData.funFacts.split(',').map((f) => f.trim()).filter(Boolean);
    }

    // Process new uploaded images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => `/uploads/${file.filename}`);
<<<<<<< HEAD
      // Usually, we'd want to handle replacing vs appending. 
      // For this implementation, we will replace existing images if new ones are uploaded.
      updateData.images = newImages;
      updateData.image = newImages[0];
    } else if (updateData.imageUrl && !updateData.images) {
      // Fallback
       updateData.images = [updateData.imageUrl];
       updateData.image = updateData.imageUrl;
=======
      updateData.images = newImages;
      updateData.image = newImages[0];
    } else if (updateData.imageUrl && !updateData.images) {
      updateData.images = [updateData.imageUrl];
      updateData.image = updateData.imageUrl;
    }

    // Handle coordinates update
    if (updateData.lat !== undefined && updateData.lng !== undefined) {
      updateData.coordinates = {
        lat: parseFloat(updateData.lat),
        lng: parseFloat(updateData.lng),
        locationName: updateData.locationName || '',
      };
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
    }

    const species = await Species.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!species) {
      return res.status(404).json({ success: false, message: 'Species not found.' });
    }

<<<<<<< HEAD
    res.json({ success: true, message: 'Species updated successfully.', data: species });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
=======
    sendResponse(res, 200, species, 'Species updated successfully.');
  } catch (error) {
    sendResponse(res, 400, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

exports.deleteSpecies = async (req, res) => {
  try {
    const { id } = req.params;
    const species = await Species.findByIdAndDelete(id);

    if (!species) {
      return res.status(404).json({ success: false, message: 'Species not found.' });
    }

<<<<<<< HEAD
    res.json({ success: true, message: `Species "${species.name}" deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
=======
    sendResponse(res, 200, null, `Species "${species.name}" deleted successfully.`);
  } catch (error) {
    sendResponse(res, 500, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

// ══════════════════════════════════════════════════════════════
// ECOSYSTEM MANAGEMENT
// ══════════════════════════════════════════════════════════════

exports.getAllEcosystemsAdmin = async (req, res) => {
  try {
    const { search = '' } = req.query;
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};
    const ecosystems = await Ecosystem.find(query).sort({ name: 1 });

    // Attach live species count to each ecosystem
    const withCounts = await Promise.all(
      ecosystems.map(async (eco) => {
<<<<<<< HEAD
        const count = await Species.countDocuments({ ecosystem: eco._id });
=======
        const count = await Species.countDocuments({ ecosystem: eco.name });
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
        return { ...eco.toObject(), speciesCount: count };
      })
    );

    res.json({ success: true, data: withCounts });
  } catch (error) {
<<<<<<< HEAD
    res.status(500).json({ success: false, message: error.message });
=======
    sendResponse(res, 500, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

exports.createEcosystem = async (req, res) => {
  try {
    const data = req.body;
<<<<<<< HEAD
    if (data.states && typeof data.states === 'string') {
      data.states = data.states.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (data.keyFeatures && typeof data.keyFeatures === 'string') {
      data.keyFeatures = data.keyFeatures.split(',').map((f) => f.trim()).filter(Boolean);
    }

    const ecosystem = new Ecosystem(data);
    await ecosystem.save();
    res.status(201).json({
      success: true,
      message: 'Ecosystem created successfully.',
      data: ecosystem,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
=======

    // Map frontend field names to model field names
    const mappedData = {
      name: data.name,
      description: data.description || '',
      zone: data.states || '', // frontend sends 'states' but model uses 'zone' for the zone name
      keySpecies: [],
      majorThreats: [],
      area: data.area ? parseFloat(data.area) : 0,
      image: data.imageUrl || '',
    };

    if (data.keyFeatures && typeof data.keyFeatures === 'string') {
      mappedData.keySpecies = data.keyFeatures.split(',').map((f) => f.trim()).filter(Boolean);
    }
    if (data.threats && typeof data.threats === 'string') {
      mappedData.majorThreats = data.threats.split(',').map((t) => t.trim()).filter(Boolean);
    }
    // Handle array inputs
    if (Array.isArray(data.keyFeatures)) mappedData.keySpecies = data.keyFeatures;
    if (Array.isArray(data.threats)) mappedData.majorThreats = data.threats;

    const ecosystem = new Ecosystem(mappedData);
    await ecosystem.save();
    sendResponse(res, 201, ecosystem, 'Ecosystem created successfully.');
  } catch (error) {
    if (error.code === 11000) {
      return sendResponse(res, 400, null, 'Ecosystem with this name already exists.', false);
    }
    sendResponse(res, 400, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

exports.updateEcosystem = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
<<<<<<< HEAD
    if (data.states && typeof data.states === 'string') {
      data.states = data.states.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (data.keyFeatures && typeof data.keyFeatures === 'string') {
      data.keyFeatures = data.keyFeatures.split(',').map((f) => f.trim()).filter(Boolean);
    }

    const ecosystem = await Ecosystem.findByIdAndUpdate(id, data, {
=======

    // Map frontend field names to model field names
    const mappedData = {
      name: data.name,
      description: data.description || '',
      zone: data.states || '',
      area: data.area ? parseFloat(data.area) : 0,
      image: data.imageUrl || '',
      keySpecies: [],
      majorThreats: [],
    };

    if (data.keyFeatures && typeof data.keyFeatures === 'string') {
      mappedData.keySpecies = data.keyFeatures.split(',').map((f) => f.trim()).filter(Boolean);
    } else if (Array.isArray(data.keyFeatures)) {
      mappedData.keySpecies = data.keyFeatures;
    }

    if (data.threats && typeof data.threats === 'string') {
      mappedData.majorThreats = data.threats.split(',').map((t) => t.trim()).filter(Boolean);
    } else if (Array.isArray(data.threats)) {
      mappedData.majorThreats = data.threats;
    }

    const ecosystem = await Ecosystem.findByIdAndUpdate(id, mappedData, {
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
      new: true,
      runValidators: true,
    });
    if (!ecosystem) {
      return res.status(404).json({ success: false, message: 'Ecosystem not found.' });
    }

<<<<<<< HEAD
    res.json({ success: true, message: 'Ecosystem updated successfully.', data: ecosystem });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
=======
    sendResponse(res, 200, ecosystem, 'Ecosystem updated successfully.');
  } catch (error) {
    sendResponse(res, 400, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

exports.deleteEcosystem = async (req, res) => {
  try {
    const { id } = req.params;
<<<<<<< HEAD
    const speciesCount = await Species.countDocuments({ ecosystem: id });
    if (speciesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${speciesCount} species are linked to this ecosystem. Reassign them first.`,
      });
    }

    const ecosystem = await Ecosystem.findByIdAndDelete(id);
    if (!ecosystem) {
      return res.status(404).json({ success: false, message: 'Ecosystem not found.' });
    }

    res.json({ success: true, message: `Ecosystem "${ecosystem.name}" deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
=======
    const ecosystem = await Ecosystem.findById(id);
    if (!ecosystem) {
      return res.status(404).json({ success: false, message: 'Ecosystem not found.' });
    }
    // Species.ecosystem is a String, not ObjectId — query by name
    const speciesCount = await Species.countDocuments({ ecosystem: ecosystem.name });
    if (speciesCount > 0) {
      return sendResponse(res, 400, null, `Cannot delete: ${speciesCount} species are linked to this ecosystem. Reassign them first.`, false);
    }

    const deletedEcosystem = await Ecosystem.findByIdAndDelete(id);
    if (!deletedEcosystem) {
      return sendResponse(res, 404, null, 'Ecosystem not found.', false);
    }

    sendResponse(res, 200, null, `Ecosystem "${deletedEcosystem.name}" deleted successfully.`);
  } catch (error) {
    sendResponse(res, 500, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

// ══════════════════════════════════════════════════════════════
// ZONE MANAGEMENT
// ══════════════════════════════════════════════════════════════

exports.getAllZonesAdmin = async (req, res) => {
  try {
    const { search = '' } = req.query;
<<<<<<< HEAD
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};
    const zones = await Zone.find(query).sort({ name: 1 });

    const withCounts = await Promise.all(
      zones.map(async (zone) => {
        const count = await Species.countDocuments({ zone: zone._id });
=======
    const query = search ? { zoneName: { $regex: search, $options: 'i' } } : {};
    const zones = await Zone.find(query).sort({ zoneName: 1 });

    const withCounts = await Promise.all(
      zones.map(async (zone) => {
        const count = await Species.countDocuments({ zone: zone.zoneName });
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
        return { ...zone.toObject(), speciesCount: count };
      })
    );

    res.json({ success: true, data: withCounts });
  } catch (error) {
<<<<<<< HEAD
    res.status(500).json({ success: false, message: error.message });
=======
    sendResponse(res, 500, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

exports.createZone = async (req, res) => {
  try {
    const data = req.body;
<<<<<<< HEAD
    if (data.states && typeof data.states === 'string') {
      data.states = data.states.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (data.keySpecies && typeof data.keySpecies === 'string') {
      data.keySpecies = data.keySpecies.split(',').map((s) => s.trim()).filter(Boolean);
    }

    const zone = new Zone(data);
    await zone.save();
    res.status(201).json({ success: true, message: 'Zone created successfully.', data: zone });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
=======

    // Map frontend field names to model field names
    const mappedData = {
      zoneName: data.name, // frontend sends 'name', model uses 'zoneName'
      description: data.description || '',
      statesCovered: [],
      keySpecies: [],
      ecosystems: [],
      area: data.area ? parseFloat(data.area) : 0,
      image: data.imageUrl || '',
    };

    if (data.states && typeof data.states === 'string') {
      mappedData.statesCovered = data.states.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (Array.isArray(data.states)) {
      mappedData.statesCovered = data.states;
    }

    if (data.keySpecies && typeof data.keySpecies === 'string') {
      mappedData.keySpecies = data.keySpecies.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (Array.isArray(data.keySpecies)) {
      mappedData.keySpecies = data.keySpecies;
    }

    if (data.threats && typeof data.threats === 'string') {
      mappedData.ecosystems = data.threats.split(',').map((t) => t.trim()).filter(Boolean);
    } else if (Array.isArray(data.threats)) {
      mappedData.ecosystems = data.threats;
    }

    const zone = new Zone(mappedData);
    await zone.save();
    sendResponse(res, 201, zone, 'Zone created successfully.');
  } catch (error) {
    if (error.code === 11000) {
      return sendResponse(res, 400, null, 'Zone with this name already exists.', false);
    }
    sendResponse(res, 400, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

exports.updateZone = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
<<<<<<< HEAD
    if (data.states && typeof data.states === 'string') {
      data.states = data.states.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (data.keySpecies && typeof data.keySpecies === 'string') {
      data.keySpecies = data.keySpecies.split(',').map((s) => s.trim()).filter(Boolean);
    }

    const zone = await Zone.findByIdAndUpdate(id, data, { new: true, runValidators: true });
=======

    // Map frontend field names to model field names
    const mappedData = {
      zoneName: data.name,
      description: data.description || '',
      statesCovered: [],
      keySpecies: [],
      ecosystems: [],
      area: data.area ? parseFloat(data.area) : 0,
      image: data.imageUrl || '',
    };

    if (data.states && typeof data.states === 'string') {
      mappedData.statesCovered = data.states.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (Array.isArray(data.states)) {
      mappedData.statesCovered = data.states;
    }

    if (data.keySpecies && typeof data.keySpecies === 'string') {
      mappedData.keySpecies = data.keySpecies.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (Array.isArray(data.keySpecies)) {
      mappedData.keySpecies = data.keySpecies;
    }

    if (data.threats && typeof data.threats === 'string') {
      mappedData.ecosystems = data.threats.split(',').map((t) => t.trim()).filter(Boolean);
    } else if (Array.isArray(data.threats)) {
      mappedData.ecosystems = data.threats;
    }

    const zone = await Zone.findByIdAndUpdate(id, mappedData, { new: true, runValidators: true });
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found.' });
    }

<<<<<<< HEAD
    res.json({ success: true, message: 'Zone updated successfully.', data: zone });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
=======
    sendResponse(res, 200, zone, 'Zone updated successfully.');
  } catch (error) {
    sendResponse(res, 400, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

exports.deleteZone = async (req, res) => {
  try {
    const { id } = req.params;
<<<<<<< HEAD
    const speciesCount = await Species.countDocuments({ zone: id });
    if (speciesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${speciesCount} species are linked to this zone.`,
      });
    }

    const zone = await Zone.findByIdAndDelete(id);
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found.' });
    }

    res.json({ success: true, message: `Zone "${zone.name}" deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
=======
    const zone = await Zone.findById(id);
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found.' });
    }
    // Species.zone is a String, not ObjectId — query by zoneName
    const speciesCount = await Species.countDocuments({ zone: zone.zoneName });
    if (speciesCount > 0) {
      return sendResponse(res, 400, null, `Cannot delete: ${speciesCount} species are linked to this zone.`, false);
    }

    const deletedZone = await Zone.findByIdAndDelete(id);
    if (!deletedZone) {
      return sendResponse(res, 404, null, 'Zone not found.', false);
    }

    sendResponse(res, 200, null, `Zone "${deletedZone.zoneName}" deleted successfully.`);
  } catch (error) {
    sendResponse(res, 500, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

// ══════════════════════════════════════════════════════════════
// QUIZ MANAGEMENT
// ══════════════════════════════════════════════════════════════

exports.getAllQuestionsAdmin = async (req, res) => {
  try {
    const {
      page = 1,
<<<<<<< HEAD
      limit = 15,
=======
      limit = 100,
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
      search = '',
      difficulty = '',
      category = '',
    } = req.query;

    const query = {};
    if (search) query.question = { $regex: search, $options: 'i' };
    if (difficulty) query.difficulty = difficulty;
    if (category) query.category = category;

    const total = await QuizQuestion.countDocuments(query);
    const questions = await QuizQuestion.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

<<<<<<< HEAD
    res.json({
      success: true,
=======
    sendResponse(res, 200, {
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
      data: questions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
<<<<<<< HEAD
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
=======
    }, "Quiz questions fetched successfully");
  } catch (error) {
    sendResponse(res, 500, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

exports.createQuestion = async (req, res) => {
  try {
    const question = new QuizQuestion(req.body);
    await question.save();
<<<<<<< HEAD
    res.status(201).json({
      success: true,
      message: 'Question created successfully.',
      data: question,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
=======
    sendResponse(res, 201, question, 'Question created successfully.');
  } catch (error) {
    sendResponse(res, 400, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await QuizQuestion.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }
<<<<<<< HEAD
    res.json({ success: true, message: 'Question updated successfully.', data: question });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
=======
    sendResponse(res, 200, question, 'Question updated successfully.');
  } catch (error) {
    sendResponse(res, 400, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await QuizQuestion.findByIdAndDelete(id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }
<<<<<<< HEAD
    res.json({ success: true, message: 'Question deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
=======
    sendResponse(res, 200, null, 'Question deleted successfully.');
  } catch (error) {
    sendResponse(res, 500, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

// ══════════════════════════════════════════════════════════════
// MAP DATA MANAGEMENT
// ══════════════════════════════════════════════════════════════

exports.getMapSpeciesData = async (req, res) => {
  try {
<<<<<<< HEAD
    const species = await Species.find({
      'coordinates.lat': { $exists: true, $ne: null },
    })
      .select('name scientificName conservationStatus coordinates imageUrl ecosystem zone')
      .populate('ecosystem', 'name')
      .populate('zone', 'name');

    res.json({ success: true, data: species, total: species.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
=======
    const [animals, plants] = await Promise.all([
      Species.find({ 'coordinates.lat': { $exists: true, $ne: null } })
        .select('name scientificName conservationStatus coordinates imageUrl ecosystem zone type')
        .populate('ecosystem', 'name')
        .populate('zone', 'name')
        .lean(),
      Plant.find({ 'coordinates.lat': { $exists: true, $ne: null } })
        .select('name scientificName conservationStatus coordinates imageUrl ecosystem zone type')
        .lean(),
    ]);

    const animalsWithCategory = animals.map((s) => ({ ...s, category: 'animal', _id: s._id.toString() }));
    const plantsWithCategory = plants.map((p) => ({ ...p, category: 'plant', _id: p._id.toString() }));

    sendResponse(res, 200, { data: [...animalsWithCategory, ...plantsWithCategory], total: animals.length + plants.length }, "Map species data fetched successfully");
  } catch (error) {
    sendResponse(res, 500, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};

exports.updateSpeciesCoordinates = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng, locationName } = req.body;

    if (lat === undefined || lat === null || lng === undefined || lng === null) {
<<<<<<< HEAD
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required.',
      });
    }

    const species = await Species.findByIdAndUpdate(
      id,
      {
        coordinates: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          locationName: locationName || '',
        },
      },
      { new: true }
    );

    if (!species) {
      return res.status(404).json({ success: false, message: 'Species not found.' });
    }

    res.json({
      success: true,
      message: 'Coordinates updated successfully.',
      data: species,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
=======
      return sendResponse(res, 400, null, 'Latitude and longitude are required.', false);
    }

    const coords = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      locationName: locationName || '',
    };

    // Try Species (animals) first, then Plant
    let updated = await Species.findByIdAndUpdate(id, { coordinates: coords }, { new: true });
    if (!updated) {
      updated = await Plant.findByIdAndUpdate(id, { coordinates: coords }, { new: true });
    }

    if (!updated) {
      return sendResponse(res, 404, null, 'Species not found.', false);
    }

    sendResponse(res, 200, updated, 'Coordinates updated successfully.');
  } catch (error) {
    sendResponse(res, 400, null, error.message, false);
  }
};

// ══════════════════════════════════════════════════════════════
// DEDUPLICATION — POST /api/admin/deduplicate
// Merges duplicate Species and Plant records by normalized name.
// Safe to run at any time; returns a full merge log.
// ══════════════════════════════════════════════════════════════

const User              = require('../models/User');
const PredictionHistory = require('../models/PredictionHistory');

/** Normalize a species/plant name for grouping */
const _normName = (n) => (n || '').toLowerCase().trim().replace(/\s+/g, ' ');

/** Pick the most critical conservation status from an array */
const _STATUS_RANK = [
  'Least Concern', 'Near Threatened', 'Vulnerable',
  'Endangered', 'Critically Endangered', 'Extinct in Wild', 'Extinct',
];
const _mostCritical = (arr) =>
  arr.reduce((best, s) => {
    const idx = _STATUS_RANK.indexOf(s);
    return idx > _STATUS_RANK.indexOf(best) ? s : best;
  }, 'Least Concern');

/** Union arrays, remove falsy, deduplicate */
const _union = (arrays) => [...new Set(arrays.flat().filter(Boolean))];

/** Keep only valid image URLs */
const _validImg = (u) =>
  typeof u === 'string' && (u.startsWith('http') || u.startsWith('/uploads/'));

/** Core merge logic shared by both Species and Plant collections */
async function _mergeCollection(Model, favField, label) {
  const mergeLog = [];
  let   merged   = 0;
  let   removed  = 0;

  const all = await Model.find({}).select(
    'name normalizedName zone zones ecosystem ecosystems imageUrl images ' +
    'conservationStatus description funFacts threats uses _id population'
  ).lean();

  // Group by normalized name
  const groups = {};
  for (const doc of all) {
    const key = _normName(doc.name);
    if (!groups[key]) groups[key] = [];
    groups[key].push(doc);
  }

  for (const [normKey, records] of Object.entries(groups)) {
    if (records.length <= 1) continue;

    // Primary = longest description
    const primary = records.reduce((a, b) =>
      (a.description || '').length >= (b.description || '').length ? a : b
    );
    const secondaries   = records.filter((r) => String(r._id) !== String(primary._id));
    const secondaryIds  = secondaries.map((r) => r._id);
    const allIds        = records.map((r) => r._id);

    const mergedZones  = _union(records.map((r) => [r.zone, ...(r.zones || [])]));
    const mergedEcos   = _union(records.map((r) => [r.ecosystem, ...(r.ecosystems || [])]));
    const allImgs      = records.flatMap((r) => [r.imageUrl, ...(r.images || [])]).filter(_validImg);
    const mergedImgs   = [...new Set(allImgs)];
    const bestStatus   = _mostCritical(records.map((r) => r.conservationStatus).filter(Boolean));
    const bestPop      = Math.max(...records.map((r) => r.population || 0));

    await Model.findByIdAndUpdate(primary._id, {
      $set: {
        normalizedName:     normKey,
        zones:              mergedZones,
        ecosystems:         mergedEcos,
        images:             mergedImgs,
        imageUrl:           mergedImgs[0] || primary.imageUrl || '',
        conservationStatus: bestStatus,
        threats:            _union(records.map((r) => r.threats  || [])),
        funFacts:           _union(records.map((r) => r.funFacts || [])),
        uses:               _union(records.map((r) => r.uses     || [])),
        population:         bestPop,
      },
    }, { runValidators: false });

    // Re-point user favorites: pull secondary IDs, add primary
    if (secondaryIds.length > 0) {
      await User.updateMany(
        { [favField]: { $in: secondaryIds } },
        { $pull: { [favField]: { $in: secondaryIds } } }
      );
      await User.updateMany(
        { [favField]: { $in: allIds } },
        { $addToSet: { [favField]: primary._id } }
      );
    }

    await Model.deleteMany({ _id: { $in: secondaryIds } });

    mergeLog.push({
      collection: label,
      name:       primary.name,
      normalized: normKey,
      merged:     records.length,
      removed:    secondaryIds.length,
      zones:      mergedZones,
      status:     bestStatus,
      images:     mergedImgs.length,
    });
    merged++;
    removed += secondaryIds.length;
  }

  return { merged, removed, log: mergeLog };
}

exports.runDeduplication = async (req, res) => {
  try {
    const [beforeSpecies, beforePlants] = await Promise.all([
      Species.countDocuments(),
      Plant.countDocuments(),
    ]);

    const [speciesResult, plantResult] = await Promise.all([
      _mergeCollection(Species, 'favorites',      'Species'),
      _mergeCollection(Plant,   'plantFavorites', 'Plant'),
    ]);

    const [afterSpecies, afterPlants] = await Promise.all([
      Species.countDocuments(),
      Plant.countDocuments(),
    ]);

    // Validation: check for remaining duplicates
    const [dupSpecies, dupPlants] = await Promise.all([
      Species.aggregate([
        { $group: { _id: { $toLower: { $trim: { input: '$name' } } }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
      ]),
      Plant.aggregate([
        { $group: { _id: { $toLower: { $trim: { input: '$name' } } }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
      ]),
    ]);

    sendResponse(res, 200, {
      summary: {
        before: { species: beforeSpecies, plants: beforePlants, total: beforeSpecies + beforePlants },
        after:  { species: afterSpecies,  plants: afterPlants,  total: afterSpecies  + afterPlants  },
        removed: {
          species: beforeSpecies - afterSpecies,
          plants:  beforePlants  - afterPlants,
          total:   (beforeSpecies + beforePlants) - (afterSpecies + afterPlants),
        },
        groupsMerged: {
          species: speciesResult.merged,
          plants:  plantResult.merged,
        },
        remainingDuplicates: {
          species: dupSpecies.length,
          plants:  dupPlants.length,
        },
      },
      mergeLog: [...speciesResult.log, ...plantResult.log],
    }, 'Deduplication complete.');
  } catch (error) {
    console.error('Deduplication error:', error);
    sendResponse(res, 500, null, error.message, false);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
  }
};