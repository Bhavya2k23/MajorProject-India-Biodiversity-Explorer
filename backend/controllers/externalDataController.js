/**
 * External Data Controller
 * Enhanced controller using the ExternalDataService layer
 */

const {
  externalDataService,
  ApiRateLimitError,
  ApiAuthError,
  ApiNotFoundError,
  ApiServerError,
  ApiError,
} = require("../services/externalDataService");
const { normalizeConservationStatus, extractHabitat, extractLocations } = require("../services/dataNormalizer");
const cacheService = require("../services/cacheService");

// ─── Helper to add cache headers ─────────────────────────────────
const addCacheHeaders = (res, cacheSource, service) => {
  if (cacheSource === "memory") {
    res.set("X-Cache", "HIT");
    res.set("X-Cache-Source", "memory");
  } else if (cacheSource === "mongodb") {
    res.set("X-Cache", "HIT");
    res.set("X-Cache-Source", "mongodb");
  } else {
    res.set("X-Cache", "MISS");
  }
  res.set("X-Service", service || "external");
};

// ─── Helper for error responses ──────────────────────────────────
const handleApiError = (error, res, service) => {
  // Log structured error
  console.error(JSON.stringify({
    type: error.name || "ApiError",
    service,
    message: error.message,
    statusCode: error.statusCode,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  }));

  if (error instanceof ApiRateLimitError) {
    res.set("Retry-After", error.retryAfter || 60);
    return res.status(429).json({
      success: false,
      error: "ApiRateLimitError",
      message: error.message,
      service: error.service,
      retryAfter: error.retryAfter,
    });
  }

  if (error instanceof ApiAuthError) {
    return res.status(401).json({
      success: false,
      error: "ApiAuthError",
      message: error.message,
      service: error.service,
    });
  }

  if (error instanceof ApiNotFoundError) {
    return res.status(404).json({
      success: false,
      error: "ApiNotFoundError",
      message: error.message,
      service: error.service,
    });
  }

  if (error instanceof ApiServerError) {
    return res.status(502).json({
      success: false,
      error: "ApiServerError",
      message: error.message,
      service: error.service,
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.name,
      message: error.message,
      service: error.service,
    });
  }

  // Unknown error
  return res.status(500).json({
    success: false,
    error: "InternalServerError",
    message: "An unexpected error occurred",
  });
};

// ─────────────────────────────────────────────────────────────────
// GBIF Species Search
// GET /api/external/gbif/search?name=speciesName
// ─────────────────────────────────────────────────────────────────
exports.searchGbifSpecies = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Species name is required",
      });
    }

    const result = await externalDataService.searchGbifSpecies(name);
    addCacheHeaders(res, result.cache, "gbif");

    res.json({
      success: true,
      data: result.data,
      cached: result.cache !== null,
      cacheSource: result.cache,
    });
  } catch (error) {
    handleApiError(error, res, "gbif");
  }
};

// ─────────────────────────────────────────────────────────────────
// GBIF Occurrences (species location data)
// GET /api/external/gbif/occurrences?speciesKey=123&limit=50
// ─────────────────────────────────────────────────────────────────
exports.getGbifOccurrences = async (req, res) => {
  try {
    const { speciesKey, limit = 500 } = req.query;

    if (!speciesKey) {
      return res.status(400).json({
        success: false,
        message: "Species key is required",
      });
    }

    const result = await externalDataService.getGbifOccurrences(speciesKey, limit);
    addCacheHeaders(res, result.cache, "gbif");

    res.json({
      success: true,
      data: result.data,
      cached: result.cache !== null,
      cacheSource: result.cache,
    });
  } catch (error) {
    handleApiError(error, res, "gbif");
  }
};

// ─────────────────────────────────────────────────────────────────
// GBIF Species by Country
// GET /api/external/gbif/country?countryCode=IN&limit=100
// ─────────────────────────────────────────────────────────────────
exports.getSpeciesByCountry = async (req, res) => {
  try {
    const { countryCode, limit = 500 } = req.query;

    if (!countryCode) {
      return res.status(400).json({
        success: false,
        message: "Country code is required (e.g., IN for India)",
      });
    }

    const result = await externalDataService.getSpeciesByCountry(countryCode, limit);
    addCacheHeaders(res, result.cache, "gbif");

    res.json({
      success: true,
      data: result.data,
      cached: result.cache !== null,
      cacheSource: result.cache,
    });
  } catch (error) {
    handleApiError(error, res, "gbif");
  }
};

// ─────────────────────────────────────────────────────────────────
// IUCN Conservation Status
// GET /api/external/iucn/status?taxonId=12345
// ─────────────────────────────────────────────────────────────────
exports.getIucnStatus = async (req, res) => {
  try {
    const { taxonId } = req.query;

    if (!taxonId) {
      return res.status(400).json({
        success: false,
        message: "Taxonomy ID is required",
      });
    }

    const result = await externalDataService.getIucnStatus(taxonId);
    addCacheHeaders(res, result.cache, "iucn");

    // Normalize IUCN data for response
    const normalizedData = result.data ? {
      taxonid: result.data.taxonid,
      scientificName: result.data.scientific_name,
      category: result.data.category,
      conservationStatus: normalizeConservationStatus(result.data.category),
      assessmentYear: result.data.assessment_year || result.data.assessmentYear,
      habitat: extractHabitat(result.data),
    } : null;

    res.json({
      success: true,
      data: normalizedData,
      cached: result.cache !== null,
      cacheSource: result.cache,
    });
  } catch (error) {
    handleApiError(error, res, "iucn");
  }
};

// ─────────────────────────────────────────────────────────────────
// Combined Species Data (IUCN + GBIF)
// GET /api/external/species/combined?name=Tiger&taxonId=123&speciesKey=456
// ─────────────────────────────────────────────────────────────────
exports.getCombinedSpeciesData = async (req, res) => {
  try {
    const { name, taxonId, speciesKey } = req.query;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Species name is required",
      });
    }

    const result = await externalDataService.getCombinedSpeciesData(name, taxonId, speciesKey);
    addCacheHeaders(res, result.cache, "combined");

    res.json({
      success: true,
      data: result.data,
      source: result.source,
      cached: result.cache !== null,
      cacheSource: result.cache,
    });
  } catch (error) {
    handleApiError(error, res, "combined");
  }
};

// ─────────────────────────────────────────────────────────────────
// Live Species Data (bypass cache)
// GET /api/external/species/:name/live
// ─────────────────────────────────────────────────────────────────
exports.getLiveSpeciesData = async (req, res) => {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Species name is required",
      });
    }

    // Force fresh data from GBIF (bypasses cache)
    const gbifResult = await externalDataService.getLiveSpeciesData(name);

    // Also get occurrences
    let occurrences = [];
    if (gbifResult.data?.key) {
      try {
        const occResult = await externalDataService.getGbifOccurrences(gbifResult.data.key, 50);
        occurrences = occResult.data || [];
      } catch (occError) {
        // Occurrences are optional, continue
        console.error(JSON.stringify({
          type: "OCCURRENCE_FETCH_ERROR",
          message: occError.message,
          timestamp: new Date().toISOString(),
        }));
      }
    }

    // Try IUCN if taxonId provided
    let iucnData = null;
    if (req.query.taxonId) {
      try {
        const iucnResult = await externalDataService.getIucnStatus(req.query.taxonId);
        iucnData = iucnResult.data;
      } catch (iucnError) {
        // IUCN is optional, continue with GBIF only
        console.error(JSON.stringify({
          type: "IUCN_FETCH_ERROR",
          message: iucnError.message,
          timestamp: new Date().toISOString(),
        }));
      }
    }

    // Build combined response
    const combinedData = {
      name,
      scientificName: gbifResult.data?.scientificName || name,
      conservationStatus: iucnData ? normalizeConservationStatus(iucnData.category) : "Unknown",
      habitat: iucnData ? extractHabitat(iucnData) : [],
      locations: occurrences.map(o => ({
        lat: o.lat,
        lng: o.lng,
        country: o.country,
        locality: o.locality,
      })),
      lastUpdated: new Date().toISOString(),
      gbifKey: gbifResult.data?.key || null,
      iucnCategory: iucnData?.category || null,
      source: "live",
    };

    res.set("X-Cache", "MISS");
    res.set("X-Cache-Source", "live");

    res.json({
      success: true,
      data: combinedData,
      source: "live",
      cached: false,
    });
  } catch (error) {
    handleApiError(error, res, "gbif");
  }
};

// ─────────────────────────────────────────────────────────────────
// Get Species Data by Name (with caching)
// GET /api/external/species/:name
// ─────────────────────────────────────────────────────────────────
exports.getSpeciesByName = async (req, res) => {
  try {
    const { name } = req.params;
    const { taxonId, speciesKey } = req.query;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Species name is required",
      });
    }

    const result = await externalDataService.getCombinedSpeciesData(name, taxonId, speciesKey);
    addCacheHeaders(res, result.cache, "combined");

    res.json({
      success: true,
      data: result.data,
      source: result.source,
      cached: result.cache !== null,
      cacheSource: result.cache,
    });
  } catch (error) {
    handleApiError(error, res, "combined");
  }
};

// ─────────────────────────────────────────────────────────────────
// Get Conservation Status from GBIF
// GET /api/external/status/:speciesKey
// ─────────────────────────────────────────────────────────────────
exports.getConservationStatus = async (req, res) => {
  try {
    const { speciesKey } = req.params;

    if (!speciesKey) {
      return res.status(400).json({
        success: false,
        message: "Species key is required",
      });
    }

    // Get basic species info from GBIF
    const result = await externalDataService.searchGbifSpecies(speciesKey);

    // Try to get IUCN data if taxonId provided
    let conservationStatus = "Unknown";
    let iucnCategory = null;

    if (req.query.taxonId) {
      try {
        const iucnResult = await externalDataService.getIucnStatus(req.query.taxonId);
        if (iucnResult.data?.category) {
          conservationStatus = normalizeConservationStatus(iucnResult.data.category);
          iucnCategory = iucnResult.data.category;
        }
      } catch (iucnError) {
        console.error(JSON.stringify({
          type: "IUCN_STATUS_ERROR",
          message: iucnError.message,
          timestamp: new Date().toISOString(),
        }));
        // Continue with GBIF data only
      }
    }

    addCacheHeaders(res, result.cache, "gbif");

    res.json({
      success: true,
      data: {
        speciesKey: result.data?.key,
        scientificName: result.data?.scientificName,
        conservationStatus,
        iucnCategory,
        source: iucnCategory ? "iucn" : "gbif",
      },
      cached: result.cache !== null,
      cacheSource: result.cache,
    });
  } catch (error) {
    handleApiError(error, res, "gbif");
  }
};

// ─────────────────────────────────────────────────────────────────
// Get Occurrence Map Data
// GET /api/external/occurrences/:speciesKey
// ─────────────────────────────────────────────────────────────────
exports.getOccurrenceMapData = async (req, res) => {
  try {
    const { speciesKey } = req.params;
    const { limit = 500 } = req.query;

    if (!speciesKey) {
      return res.status(400).json({
        success: false,
        message: "Species key is required",
      });
    }

    const result = await externalDataService.getGbifOccurrences(speciesKey, limit);
    addCacheHeaders(res, result.cache, "gbif");

    // Format for map display
    const mapData = (result.data || []).map(occ => ({
      lat: occ.lat,
      lng: occ.lng,
      label: occ.locality || occ.state || occ.country || "Unknown location",
      date: occ.date,
      basis: occ.basis,
    }));

    res.json({
      success: true,
      data: mapData,
      count: mapData.length,
      cached: result.cache !== null,
      cacheSource: result.cache,
    });
  } catch (error) {
    handleApiError(error, res, "gbif");
  }
};

// ─────────────────────────────────────────────────────────────────
// Get Normalized Species Summary
// GET /api/external/summary/:name
// ─────────────────────────────────────────────────────────────────
exports.getSpeciesSummary = async (req, res) => {
  try {
    const { name } = req.params;
    const { taxonId, speciesKey } = req.query;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Species name is required",
      });
    }

    // Get combined data
    const result = await externalDataService.getCombinedSpeciesData(name, taxonId, speciesKey);
    addCacheHeaders(res, result.cache, "combined");

    res.json({
      success: true,
      data: result.data,
      source: result.source,
      cached: result.cache !== null,
      cacheSource: result.cache,
    });
  } catch (error) {
    handleApiError(error, res, "combined");
  }
};

// ─────────────────────────────────────────────────────────────────
// Clear Cache (admin endpoint)
// POST /api/external/cache/clear
// ─────────────────────────────────────────────────────────────────
exports.clearCache = async (req, res) => {
  try {
    const { type = "all" } = req.body; // 'memory', 'mongodb', or 'all'

    let result;
    switch (type) {
      case "memory":
        result = cacheService.clearMemoryCache();
        break;
      case "mongodb":
        result = await cacheService.clearMongoDBCache();
        break;
      case "all":
      default:
        result = await cacheService.clearAllCaches();
        break;
    }

    res.json(result);
  } catch (error) {
    console.error(JSON.stringify({
      type: "CLEAR_CACHE_ERROR",
      message: error.message,
      timestamp: new Date().toISOString(),
    }));
    res.status(500).json({
      success: false,
      message: "Failed to clear cache",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────
// Get Cache Stats (admin endpoint)
// GET /api/external/cache/stats
// ─────────────────────────────────────────────────────────────────
exports.getCacheStats = async (req, res) => {
  try {
    const stats = await cacheService.getCacheStats();
    res.json(stats);
  } catch (error) {
    console.error(JSON.stringify({
      type: "CACHE_STATS_ERROR",
      message: error.message,
      timestamp: new Date().toISOString(),
    }));
    res.status(500).json({
      success: false,
      message: "Failed to get cache stats",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────
// Warm Cache (admin endpoint)
// POST /api/external/cache/warm
// ─────────────────────────────────────────────────────────────────
exports.warmCache = async (req, res) => {
  try {
    const { speciesNames } = req.body;

    if (!Array.isArray(speciesNames) || speciesNames.length === 0) {
      return res.status(400).json({
        success: false,
        message: "speciesNames must be a non-empty array",
      });
    }

    const result = await cacheService.warmCache(speciesNames);
    res.json(result);
  } catch (error) {
    console.error(JSON.stringify({
      type: "WARM_CACHE_ERROR",
      message: error.message,
      timestamp: new Date().toISOString(),
    }));
    res.status(500).json({
      success: false,
      message: "Failed to warm cache",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────
// Get Cached Species List (admin endpoint)
// GET /api/external/cache/species
// ─────────────────────────────────────────────────────────────────
exports.getCachedSpeciesList = async (req, res) => {
  try {
    const { limit = 500, skip = 0 } = req.query;
    const result = await cacheService.getCachedSpeciesList(
      parseInt(limit),
      parseInt(skip)
    );
    res.json(result);
  } catch (error) {
    console.error(JSON.stringify({
      type: "GET_CACHED_SPECIES_LIST_ERROR",
      message: error.message,
      timestamp: new Date().toISOString(),
    }));
    res.status(500).json({
      success: false,
      message: "Failed to get cached species list",
      error: error.message,
    });
  }
};
