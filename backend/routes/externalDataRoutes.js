/**
 * External Data Routes
 * GBIF, IUCN, and combined species data endpoints
 */

const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  gbifRateLimiter,
  iucnRateLimiter,
  combinedRateLimiter,
  cacheManagementRateLimiter,
} = require("../middleware/rateLimiter");

const {
  // GBIF endpoints
  searchGbifSpecies,
  getGbifOccurrences,
  getSpeciesByCountry,

  // IUCN endpoints
  getIucnStatus,

  // Combined endpoints
  getCombinedSpeciesData,

  // New endpoints
  getLiveSpeciesData,
  getSpeciesByName,
  getConservationStatus,
  getOccurrenceMapData,
  getSpeciesSummary,

  // Cache management (admin)
  clearCache,
  getCacheStats,
  warmCache,
  getCachedSpeciesList,
} = require("../controllers/externalDataController");

// ─────────────────────────────────────────────────────────────────
// PUBLIC GBIF ENDPOINTS (rate limited)
// ─────────────────────────────────────────────────────────────────

// GET /api/external/gbif/search?name=speciesName
// Search for species in GBIF database
router.get("/gbif/search", gbifRateLimiter, searchGbifSpecies);

// GET /api/external/gbif/occurrences?speciesKey=123&limit=50
// Get occurrence data for a species
router.get("/gbif/occurrences", gbifRateLimiter, getGbifOccurrences);

// GET /api/external/gbif/country?countryCode=IN&limit=100
// Get species found in a specific country
router.get("/gbif/country", gbifRateLimiter, getSpeciesByCountry);

// ─────────────────────────────────────────────────────────────────
// PUBLIC IUCN ENDPOINTS (rate limited)
// ─────────────────────────────────────────────────────────────────

// GET /api/external/iucn/status?taxonId=12345
// Get conservation status from IUCN Red List
router.get("/iucn/status", iucnRateLimiter, getIucnStatus);

// ─────────────────────────────────────────────────────────────────
// COMBINED DATA ENDPOINTS (rate limited)
// ─────────────────────────────────────────────────────────────────

// GET /api/external/species/combined?name=Tiger&taxonId=123&speciesKey=456
// Get combined GBIF + IUCN data
router.get("/species/combined", combinedRateLimiter, getCombinedSpeciesData);

// ─────────────────────────────────────────────────────────────────
// NEW LIVE DATA ENDPOINTS (no cache)
// ─────────────────────────────────────────────────────────────────

// GET /api/external/species/:name/live
// Get fresh live data directly from GBIF (bypasses cache)
// Optional query param: ?taxonId=123 for IUCN data
router.get("/species/:name/live", gbifRateLimiter, getLiveSpeciesData);

// GET /api/external/species/:name
// Get species data with caching (normal fetch - uses cache if available)
// Optional query params: ?taxonId=123&speciesKey=456 for specific data
router.get("/species/:name", combinedRateLimiter, getSpeciesByName);

// GET /api/external/summary/:name
// Get normalized species summary
// Optional query params: ?taxonId=123&speciesKey=456
router.get("/summary/:name", combinedRateLimiter, getSpeciesSummary);

// ─────────────────────────────────────────────────────────────────
// STATUS & OCCURRENCES ENDPOINTS
// ─────────────────────────────────────────────────────────────────

// GET /api/external/status/:speciesKey
// Get current conservation status for a species
// Optional query param: ?taxonId=123 for IUCN lookup
router.get("/status/:speciesKey", gbifRateLimiter, getConservationStatus);

// GET /api/external/occurrences/:speciesKey
// Get occurrence map data for a species
// Query params: ?limit=100
router.get("/occurrences/:speciesKey", gbifRateLimiter, getOccurrenceMapData);

// ─────────────────────────────────────────────────────────────────
// CACHE MANAGEMENT ENDPOINTS (admin only)
// ─────────────────────────────────────────────────────────────────

// POST /api/external/cache/clear
// Clear cache - body: { type: 'memory' | 'mongodb' | 'all' }
// Default is 'all'
router.post("/cache/clear", protect, adminOnly, cacheManagementRateLimiter, clearCache);

// GET /api/external/cache/stats
// Get cache statistics
router.get("/cache/stats", protect, adminOnly, getCacheStats);

// POST /api/external/cache/warm
// Pre-fetch and cache species data
// body: { speciesNames: ['Tiger', 'Elephant', ...] }
router.post("/cache/warm", protect, adminOnly, cacheManagementRateLimiter, warmCache);

// GET /api/external/cache/species
// Get list of cached species
// Query params: ?limit=100&skip=0
router.get("/cache/species", protect, adminOnly, getCachedSpeciesList);

module.exports = router;
