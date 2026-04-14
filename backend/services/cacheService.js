/**
 * Cache Management Service
 * Provides cache statistics, clearing, and warming functionality
 */

const CachedSpecies = require("../models/CachedSpecies");
const { externalDataService } = require("./externalDataService");

/**
 * Get comprehensive cache statistics
 * @returns {Object} Cache stats including memory cache, MongoDB cache, and hit rates
 */
const getCacheStats = async () => {
  try {
    // Get memory cache stats from service
    const memoryStats = externalDataService.getCacheStats();

    // Get MongoDB cache count
    const mongoCacheCount = await CachedSpecies.countDocuments();

    // Get oldest and newest entries
    const oldestEntry = await CachedSpecies.findOne().sort({ createdAt: 1 }).select("name createdAt");
    const newestEntry = await CachedSpecies.findOne().sort({ createdAt: -1 }).select("name createdAt");

    // Get entries expiring soon (within 1 hour)
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    const expiringSoonCount = await CachedSpecies.countDocuments({
      createdAt: { $gt: new Date(Date.now() - 23 * 60 * 60 * 1000) },
    });

    return {
      success: true,
      memory: {
        ...memoryStats.memory,
        circuitBreakers: memoryStats.circuitBreakers,
      },
      mongodb: {
        totalEntries: mongoCacheCount,
        expiringSoon: expiringSoonCount,
        oldestEntry: oldestEntry
          ? { name: oldestEntry.name, createdAt: oldestEntry.createdAt.toISOString() }
          : null,
        newestEntry: newestEntry
          ? { name: newestEntry.name, createdAt: newestEntry.createdAt.toISOString() }
          : null,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(JSON.stringify({
      type: "CACHE_STATS_ERROR",
      message: error.message,
      timestamp: new Date().toISOString(),
    }));
    throw error;
  }
};

/**
 * Clear in-memory cache only
 * Does not affect MongoDB cached species documents
 * @returns {Object} Result of clearing operation
 */
const clearMemoryCache = () => {
  try {
    const statsBefore = externalDataService.getCacheStats();
    externalDataService.clearMemoryCache();

    return {
      success: true,
      message: "Memory cache cleared successfully",
      previousStats: {
        size: statsBefore.memory.size,
        hits: statsBefore.memory.hits,
        misses: statsBefore.memory.misses,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(JSON.stringify({
      type: "CLEAR_MEMORY_CACHE_ERROR",
      message: error.message,
      timestamp: new Date().toISOString(),
    }));
    throw error;
  }
};

/**
 * Clear MongoDB cached species documents only
 * Does not affect in-memory cache
 * @returns {Object} Result of clearing operation
 */
const clearMongoDBCache = async () => {
  try {
    const countBefore = await CachedSpecies.countDocuments();
    await CachedSpecies.deleteMany({});

    return {
      success: true,
      message: "MongoDB cache cleared successfully",
      previousCount: countBefore,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(JSON.stringify({
      type: "CLEAR_MONGODB_CACHE_ERROR",
      message: error.message,
      timestamp: new Date().toISOString(),
    }));
    throw error;
  }
};

/**
 * Clear both memory and MongoDB caches
 * @returns {Object} Combined result of both clearing operations
 */
const clearAllCaches = async () => {
  const memoryResult = clearMemoryCache();
  const mongoResult = await clearMongoDBCache();

  return {
    success: true,
    message: "All caches cleared successfully",
    memory: memoryResult,
    mongodb: mongoResult,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Warm the cache with specified species names
 * Fetches and caches data for each species
 * @param {string[]} speciesNames - Array of species names to pre-fetch
 * @returns {Object} Results of warming operation
 */
const warmCache = async (speciesNames) => {
  if (!Array.isArray(speciesNames) || speciesNames.length === 0) {
    return {
      success: false,
      message: "speciesNames must be a non-empty array",
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const startTime = Date.now();
    const results = await externalDataService.warmCache(speciesNames);
    const duration = Date.now() - startTime;

    return {
      success: true,
      message: `Cache warming completed in ${duration}ms`,
      totalRequested: speciesNames.length,
      successful: results.success.length,
      failed: results.failed.length,
      results,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(JSON.stringify({
      type: "WARM_CACHE_ERROR",
      message: error.message,
      timestamp: new Date().toISOString(),
    }));
    throw error;
  }
};

/**
 * Get cache entry by species name
 * @param {string} name - Species name to look up
 * @returns {Object|null} Cache entry or null if not found
 */
const getCacheEntry = async (name) => {
  try {
    const entry = await CachedSpecies.findOne({
      name: new RegExp(`^${name}$`, "i"),
    });

    if (!entry) {
      return {
        success: true,
        found: false,
        name,
        timestamp: new Date().toISOString(),
      };
    }

    const age = Date.now() - entry.createdAt.getTime();
    const ttl = 24 * 60 * 60 * 1000; // 24 hours
    const remainingTTL = Math.max(0, ttl - age);

    return {
      success: true,
      found: true,
      name: entry.name,
      data: entry.data,
      createdAt: entry.createdAt.toISOString(),
      age: age,
      remainingTTL: remainingTTL,
      expired: age >= ttl,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(JSON.stringify({
      type: "GET_CACHE_ENTRY_ERROR",
      message: error.message,
      speciesName: name,
      timestamp: new Date().toISOString(),
    }));
    throw error;
  }
};

/**
 * Get all cached species names
 * @param {number} limit - Maximum number of entries to return
 * @param {number} skip - Number of entries to skip
 * @returns {Object} List of cached species
 */
const getCachedSpeciesList = async (limit = 5000, skip = 0) => {
  try {
    const total = await CachedSpecies.countDocuments();
    const entries = await CachedSpecies.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("name createdAt data.gbifKey data.scientificName data.conservationStatus");

    const species = entries.map((entry) => ({
      name: entry.name,
      scientificName: entry.data?.scientificName || null,
      conservationStatus: entry.data?.conservationStatus || null,
      gbifKey: entry.data?.gbifKey || null,
      cachedAt: entry.createdAt.toISOString(),
      age: Date.now() - entry.createdAt.getTime(),
    }));

    return {
      success: true,
      total,
      limit,
      skip,
      count: species.length,
      species,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(JSON.stringify({
      type: "GET_CACHED_SPECIES_LIST_ERROR",
      message: error.message,
      timestamp: new Date().toISOString(),
    }));
    throw error;
  }
};

module.exports = {
  getCacheStats,
  clearMemoryCache,
  clearMongoDBCache,
  clearAllCaches,
  warmCache,
  getCacheEntry,
  getCachedSpeciesList,
};
