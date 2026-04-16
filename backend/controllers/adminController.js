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
const Plant        = require('../models/Plant');
const Ecosystem    = require('../models/Ecosystem');
const Zone         = require('../models/Zone');
const QuizQuestion = require('../models/QuizQuestion');

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
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.',
      });
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
    res.json({
      success: true,
      message: 'Login successful.',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

exports.getProfile = async (req, res) => {
  res.json({ success: true, admin: req.admin });
};

exports.seedInitialAdmin = async (req, res) => {
  try {
    const exists = await Admin.findOne({ username: 'admin' });
    if (exists) {
      return res.json({ success: false, message: 'Admin already exists. Use login.' });
    }

    await Admin.create({
      username: 'admin',
      email: 'admin@biodiversity.in',
      password: 'Admin@123',
      role: 'superadmin',
    });

    res.status(201).json({
      success: true,
      message: 'Superadmin created successfully.',
      credentials: {
        username: 'admin',
        password: 'Admin@123',
        note: 'Change this password after your first login!',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ══════════════════════════════════════════════════════════════

exports.getDashboardStats = async (req, res) => {
  try {
    const { zone, ecosystem, conservationStatus, domain = 'all' } = req.query;

    // Build filter for species queries
    const speciesFilter = {};
    if (zone) speciesFilter.zone = { $regex: zone, $options: 'i' };
    if (ecosystem) speciesFilter.ecosystem = { $regex: ecosystem, $options: 'i' };
    if (conservationStatus) speciesFilter.conservationStatus = conservationStatus;

    // Determine which models to query based on domain
    const includeAnimals = domain === 'all' || domain === 'animals';
    const includePlants = domain === 'all' || domain === 'plants';

    // Get counts and aggregations
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
      plantStats,
    ] = await Promise.all([
      // Species (animals) counts and aggregations
      includeAnimals ? Species.countDocuments(speciesFilter) : 0,
      includeAnimals ? Species.countDocuments({
        ...speciesFilter,
        conservationStatus: { $in: ['Critically Endangered', 'Endangered', 'Vulnerable'] },
      }) : 0,
      includeAnimals ? Species.distinct('ecosystem', speciesFilter).then(e => e.length) : 0,
      includeAnimals ? Species.distinct('zone', speciesFilter).then(z => z.length) : 0,
      QuizQuestion.countDocuments(),
      includeAnimals ? Species.aggregate([
        { $match: Object.keys(speciesFilter).length > 0 ? speciesFilter : {} },
        { $group: { _id: '$conservationStatus', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]) : [],
      includeAnimals ? Species.aggregate([
        { $match: Object.keys(speciesFilter).length > 0 ? speciesFilter : {} },
        { $group: { _id: { $ifNull: ['$ecosystem', 'Unknown'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]) : [],
      includeAnimals ? Species.aggregate([
        { $match: Object.keys(speciesFilter).length > 0 ? speciesFilter : {} },
        { $group: { _id: { $ifNull: ['$zone', 'Unknown'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]) : [],
      includeAnimals ? Species.find(Object.keys(speciesFilter).length > 0 ? speciesFilter : {})
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name scientificName conservationStatus imageUrl createdAt') : [],
      // Plant counts and aggregations
      includePlants ? Plant.countDocuments(speciesFilter) : 0,
    ]);

    // Get plant aggregations if needed
    let plantByConservation = [];
    let plantByEcosystem = [];
    let plantByZone = [];
    if (includePlants) {
      const [pbc, pbe, pbz] = await Promise.all([
        Plant.aggregate([
          { $match: Object.keys(speciesFilter).length > 0 ? speciesFilter : {} },
          { $group: { _id: '$conservationStatus', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Plant.aggregate([
          { $match: Object.keys(speciesFilter).length > 0 ? speciesFilter : {} },
          { $group: { _id: { $ifNull: ['$ecosystem', 'Unknown'] }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        Plant.aggregate([
          { $match: Object.keys(speciesFilter).length > 0 ? speciesFilter : {} },
          { $group: { _id: { $ifNull: ['$zone', 'Unknown'] }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
      ]);
      plantByConservation = pbc;
      plantByEcosystem = pbe;
      plantByZone = pbz;
    }

    // Get unique filter options for dropdowns
    const [availableZones, availableEcosystems, availableStatuses] = await Promise.all([
      Species.distinct('zone'),
      Species.distinct('ecosystem'),
      Species.aggregate([
        { $group: { _id: '$conservationStatus' } },
        { $sort: { _id: 1 } },
      ]).then(res => res.map(r => r._id)),
    ]);

    res.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════
// SPECIES MANAGEMENT
// ══════════════════════════════════════════════════════════════

exports.getAllSpeciesAdmin = async (req, res) => {
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
    if (ecosystem) query.ecosystem = ecosystem;
    if (zone) query.zone = zone;

    const total = await Species.countDocuments(query);
    const species = await Species.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: species,
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

exports.createSpecies = async (req, res) => {
  try {
    const speciesData = req.body;

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

    // Handle array fields that might arrive as comma-separated strings
    if (speciesData.threats && typeof speciesData.threats === 'string') {
      speciesData.threats = speciesData.threats.split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (speciesData.funFacts && typeof speciesData.funFacts === 'string') {
      speciesData.funFacts = speciesData.funFacts.split(',').map((f) => f.trim()).filter(Boolean);
    }

    // Process uploaded images
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => `/uploads/${file.filename}`);
    } else if (speciesData.imageUrl) {
      // Fallback to imageUrl if provided
      images = [speciesData.imageUrl];
    }
    speciesData.images = images;
    // Set for backward compatibility
    if (images.length > 0) {
      speciesData.image = images[0];
    }

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
    }

    const species = await Species.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!species) {
      return res.status(404).json({ success: false, message: 'Species not found.' });
    }

    res.json({ success: true, message: 'Species updated successfully.', data: species });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteSpecies = async (req, res) => {
  try {
    const { id } = req.params;
    const species = await Species.findByIdAndDelete(id);

    if (!species) {
      return res.status(404).json({ success: false, message: 'Species not found.' });
    }

    res.json({ success: true, message: `Species "${species.name}" deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
        const count = await Species.countDocuments({ ecosystem: eco.name });
        return { ...eco.toObject(), speciesCount: count };
      })
    );

    res.json({ success: true, data: withCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createEcosystem = async (req, res) => {
  try {
    const data = req.body;

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
    res.status(201).json({
      success: true,
      message: 'Ecosystem created successfully.',
      data: ecosystem,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ecosystem with this name already exists.',
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateEcosystem = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

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
      new: true,
      runValidators: true,
    });
    if (!ecosystem) {
      return res.status(404).json({ success: false, message: 'Ecosystem not found.' });
    }

    res.json({ success: true, message: 'Ecosystem updated successfully.', data: ecosystem });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteEcosystem = async (req, res) => {
  try {
    const { id } = req.params;
    const ecosystem = await Ecosystem.findById(id);
    if (!ecosystem) {
      return res.status(404).json({ success: false, message: 'Ecosystem not found.' });
    }
    // Species.ecosystem is a String, not ObjectId — query by name
    const speciesCount = await Species.countDocuments({ ecosystem: ecosystem.name });
    if (speciesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${speciesCount} species are linked to this ecosystem. Reassign them first.`,
      });
    }

    const deletedEcosystem = await Ecosystem.findByIdAndDelete(id);
    if (!deletedEcosystem) {
      return res.status(404).json({ success: false, message: 'Ecosystem not found.' });
    }

    res.json({ success: true, message: `Ecosystem "${deletedEcosystem.name}" deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════
// ZONE MANAGEMENT
// ══════════════════════════════════════════════════════════════

exports.getAllZonesAdmin = async (req, res) => {
  try {
    const { search = '' } = req.query;
    const query = search ? { zoneName: { $regex: search, $options: 'i' } } : {};
    const zones = await Zone.find(query).sort({ zoneName: 1 });

    const withCounts = await Promise.all(
      zones.map(async (zone) => {
        const count = await Species.countDocuments({ zone: zone.zoneName });
        return { ...zone.toObject(), speciesCount: count };
      })
    );

    res.json({ success: true, data: withCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createZone = async (req, res) => {
  try {
    const data = req.body;

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
    res.status(201).json({ success: true, message: 'Zone created successfully.', data: zone });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Zone with this name already exists.',
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateZone = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

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
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found.' });
    }

    res.json({ success: true, message: 'Zone updated successfully.', data: zone });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteZone = async (req, res) => {
  try {
    const { id } = req.params;
    const zone = await Zone.findById(id);
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found.' });
    }
    // Species.zone is a String, not ObjectId — query by zoneName
    const speciesCount = await Species.countDocuments({ zone: zone.zoneName });
    if (speciesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${speciesCount} species are linked to this zone.`,
      });
    }

    const deletedZone = await Zone.findByIdAndDelete(id);
    if (!deletedZone) {
      return res.status(404).json({ success: false, message: 'Zone not found.' });
    }

    res.json({ success: true, message: `Zone "${deletedZone.zoneName}" deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════
// QUIZ MANAGEMENT
// ══════════════════════════════════════════════════════════════

exports.getAllQuestionsAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
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

    res.json({
      success: true,
      data: questions,
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

exports.createQuestion = async (req, res) => {
  try {
    const question = new QuizQuestion(req.body);
    await question.save();
    res.status(201).json({
      success: true,
      message: 'Question created successfully.',
      data: question,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
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
    res.json({ success: true, message: 'Question updated successfully.', data: question });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await QuizQuestion.findByIdAndDelete(id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }
    res.json({ success: true, message: 'Question deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════
// MAP DATA MANAGEMENT
// ══════════════════════════════════════════════════════════════

exports.getMapSpeciesData = async (req, res) => {
  try {
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

    res.json({ success: true, data: [...animalsWithCategory, ...plantsWithCategory], total: animals.length + plants.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSpeciesCoordinates = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng, locationName } = req.body;

    if (lat === undefined || lat === null || lng === undefined || lng === null) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required.',
      });
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
      return res.status(404).json({ success: false, message: 'Species not found.' });
    }

    res.json({
      success: true,
      message: 'Coordinates updated successfully.',
      data: updated,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};