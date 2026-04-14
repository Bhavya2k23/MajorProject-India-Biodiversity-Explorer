// ============================================================
// FILE: backend/routes/adminRoutes.js
//
// FIX APPLIED:
//   BUG — superAdminOnly was destructured from adminAuth middleware
//         but never actually used anywhere in this file.
//         An unused import is dead code — removed it.
//         (superAdminOnly still exists in adminAuth.js and can be
//          added to specific routes in the future if needed.)
// ============================================================

const express          = require('express');
const router           = express.Router();
const { adminAuth }    = require('../middleware/adminAuth'); // superAdminOnly removed (unused)
const adminController  = require('../controllers/adminController');

// ══════════════════════════════════════════════════════════════
// PUBLIC ROUTES — No authentication required
// ══════════════════════════════════════════════════════════════

// POST /api/admin/auth/seed  → Create first superadmin (one-time)
router.post('/auth/seed',  adminController.seedInitialAdmin);

// POST /api/admin/auth/login → Returns JWT token
router.post('/auth/login', adminController.login);

// ══════════════════════════════════════════════════════════════
// PROTECTED ROUTES — Valid admin JWT required for all below
// ══════════════════════════════════════════════════════════════

// ─── Profile ───────────────────────────────────────────────────
// GET /api/admin/auth/profile
router.get('/auth/profile', adminAuth, adminController.getProfile);

// ─── Dashboard ─────────────────────────────────────────────────
// GET /api/admin/dashboard/stats
router.get('/dashboard/stats', adminAuth, adminController.getDashboardStats);

// ─── Map Data ──────────────────────────────────────────────────
// GET   /api/admin/map/species
// PATCH /api/admin/map/species/:id/coordinates
router.get(  '/map/species',                  adminAuth, adminController.getMapSpeciesData);
router.patch('/map/species/:id/coordinates',  adminAuth, adminController.updateSpeciesCoordinates);

const upload = require('../middleware/upload');

// ─── Species Management ────────────────────────────────────────
// GET    /api/admin/species
// POST   /api/admin/species
// PUT    /api/admin/species/:id
// DELETE /api/admin/species/:id
router.get(   '/species',     adminAuth, adminController.getAllSpeciesAdmin);
router.post(  '/species',     adminAuth, upload.array('images', 5), adminController.createSpecies);
router.put(   '/species/:id', adminAuth, upload.array('images', 5), adminController.updateSpecies);
router.delete('/species/:id', adminAuth, adminController.deleteSpecies);

// ─── Ecosystem Management ──────────────────────────────────────
// GET    /api/admin/ecosystems
// POST   /api/admin/ecosystems
// PUT    /api/admin/ecosystems/:id
// DELETE /api/admin/ecosystems/:id
router.get(   '/ecosystems',     adminAuth, adminController.getAllEcosystemsAdmin);
router.post(  '/ecosystems',     adminAuth, adminController.createEcosystem);
router.put(   '/ecosystems/:id', adminAuth, adminController.updateEcosystem);
router.delete('/ecosystems/:id', adminAuth, adminController.deleteEcosystem);

// ─── Zone Management ───────────────────────────────────────────
// GET    /api/admin/zones
// POST   /api/admin/zones
// PUT    /api/admin/zones/:id
// DELETE /api/admin/zones/:id
router.get(   '/zones',     adminAuth, adminController.getAllZonesAdmin);
router.post(  '/zones',     adminAuth, adminController.createZone);
router.put(   '/zones/:id', adminAuth, adminController.updateZone);
router.delete('/zones/:id', adminAuth, adminController.deleteZone);

// ─── Quiz Management ───────────────────────────────────────────
// GET    /api/admin/quiz
// POST   /api/admin/quiz
// PUT    /api/admin/quiz/:id
// DELETE /api/admin/quiz/:id
router.get(   '/quiz',     adminAuth, adminController.getAllQuestionsAdmin);
router.post(  '/quiz',     adminAuth, adminController.createQuestion);
router.put(   '/quiz/:id', adminAuth, adminController.updateQuestion);
router.delete('/quiz/:id', adminAuth, adminController.deleteQuestion);

module.exports = router;