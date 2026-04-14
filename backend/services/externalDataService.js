/**
 * External Data Service
 * Modular service layer for GBIF and IUCN API integration
 * Features: LRU cache, MongoDB persistence, circuit breaker, request deduplication, exponential backoff
 */

const axios = require("axios");
const CachedSpecies = require("../models/CachedSpecies");

// ─── Configuration ────────────────────────────────────────────────
const GBIF_BASE_URL = "https://api.gbif.org/v1";
const IUCN_BASE_URL = "https://apiv3.iucnredlist.org/api/v3";
const IUCN_TOKEN = process.env.IUCN_API_TOKEN || "";

const CONFIG = {
  memoryCacheTTL: 30 * 60 * 1000, // 30 minutes
  mongoCacheTTL: 24 * 60 * 60 * 1000, // 24 hours
  maxMemoryCacheEntries: 500,
  gbifTimeout: 10000,
  iucnTimeout: 15000,
  circuitBreaker: {
    failureThreshold: 3,
    resetTimeout: 60 * 1000, // 60 seconds
  },
  retry: {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000,
  },
};

// ─── Custom Error Types ───────────────────────────────────────────
class ApiError extends Error {
  constructor(message, statusCode, service, originalError = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.service = service;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      service: this.service,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
    };
  }
}

class ApiRateLimitError extends ApiError {
  constructor(service, retryAfter = 60) {
    super("Rate limit exceeded", 429, service);
    this.name = "ApiRateLimitError";
    this.retryAfter = retryAfter;
  }
}

class ApiAuthError extends ApiError {
  constructor(service) {
    super("Authentication failed", 401, service);
    this.name = "ApiAuthError";
  }
}

class ApiNotFoundError extends ApiError {
  constructor(service, resource = "Resource") {
    super(`${resource} not found`, 404, service);
    this.name = "ApiNotFoundError";
  }
}

class ApiServerError extends ApiError {
  constructor(service, originalError = null) {
    super("External API server error", 502, service, originalError);
    this.name = "ApiServerError";
  }
}

// ─── Circuit Breaker State ───────────────────────────────────────
const circuitBreakers = {
  gbif: { failures: 0, isOpen: false, nextAttempt: 0 },
  iucn: { failures: 0, isOpen: false, nextAttempt: 0 },
};

// ─── In-Memory LRU Cache ─────────────────────────────────────────
class LRUCache {
  constructor(maxSize = CONFIG.maxMemoryCacheEntries, ttl = CONFIG.memoryCacheTTL) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.data;
  }

  set(key, data) {
    if (this.cache.size >= this.maxSize) {
      // Delete oldest entry (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  has(key) {
    return this.cache.has(key) && Date.now() - this.cache.get(key).timestamp <= this.ttl;
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total * 100).toFixed(2) + "%" : "0%",
    };
  }

  getAll() {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      data: entry.data,
    }));
  }
}

// ─── Request Deduplication ───────────────────────────────────────
const pendingRequests = new Map();

const deduplicate = (key, requestFn) => {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }
  const promise = requestFn()
    .finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, promise);
  return promise;
};

// ─── Circuit Breaker Functions ────────────────────────────────────
const isCircuitOpen = (service) => {
  const cb = circuitBreakers[service];
  if (!cb.isOpen) return false;
  if (Date.now() < cb.nextAttempt) return true;
  cb.isOpen = false;
  cb.failures = 0;
  return false;
};

const recordFailure = (service) => {
  const cb = circuitBreakers[service];
  cb.failures++;
  if (cb.failures >= CONFIG.circuitBreaker.failureThreshold) {
    cb.isOpen = true;
    cb.nextAttempt = Date.now() + CONFIG.circuitBreaker.resetTimeout;
    console.error(JSON.stringify({
      type: "CIRCUIT_BREAKER_OPEN",
      service,
      message: `${service.toUpperCase()} circuit breaker opened after ${cb.failures} failures`,
      nextAttempt: new Date(cb.nextAttempt).toISOString(),
    }));
  }
};

const recordSuccess = (service) => {
  circuitBreakers[service].failures = 0;
  circuitBreakers[service].isOpen = false;
};

// ─── Retry with Exponential Backoff ─────────────────────────────
const withRetry = async (fn, service, maxAttempts = CONFIG.retry.maxAttempts) => {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (error.response?.status === 429 || error.response?.status >= 500) {
        if (attempt < maxAttempts) {
          const delay = Math.min(
            CONFIG.retry.baseDelay * Math.pow(2, attempt - 1),
            CONFIG.retry.maxDelay
          );
          // Add jitter
          const jitter = delay * 0.1 * Math.random();
          await new Promise(resolve => setTimeout(resolve, delay + jitter));
          continue;
        }
      }
      throw error;
    }
  }
  throw lastError;
};

// ─── Cache Keys ──────────────────────────────────────────────────
const normalizeCacheKey = (str) => str.toLowerCase().trim().replace(/\s+/g, "_");

// ─── Main Service Class ──────────────────────────────────────────
class ExternalDataService {
  constructor() {
    this.memoryCache = new LRUCache();
    this.cacheHits = { memory: 0, mongo: 0 };
  }

  // ─── GBIF Species Search ──────────────────────────────────────
  async searchGbifSpecies(name) {
    if (!name) throw new ApiError("Species name is required", 400, "gbif");

    const cacheKey = normalizeCacheKey(`gbif_search_${name}`);

    // Check memory cache
    if (this.memoryCache.has(cacheKey)) {
      this.cacheHits.memory++;
      return { data: this.memoryCache.get(cacheKey), cache: "memory" };
    }

    // Check MongoDB cache
    const mongoCached = await CachedSpecies.findOne({
      name: new RegExp(`^${name}$`, "i"),
      "data.gbifKey": { $exists: true },
    });
    if (mongoCached && Date.now() - mongoCached.createdAt.getTime() < CONFIG.mongoCacheTTL) {
      this.cacheHits.mongo++;
      const data = {
        key: mongoCached.data.gbifKey,
        scientificName: mongoCached.data.scientificName,
        name: mongoCached.data.name,
      };
      this.memoryCache.set(cacheKey, data);
      return { data, cache: "mongodb" };
    }

    // Check circuit breaker
    if (isCircuitOpen("gbif")) {
      throw new ApiError("GBIF service temporarily unavailable", 503, "gbif");
    }

    // Make API request with deduplication
    const requestKey = `gbif_search_${name}`;
    const data = await deduplicate(requestKey, async () => {
      try {
        const response = await withRetry(async () => {
          return axios.get(`${GBIF_BASE_URL}/species/match`, {
            params: { name },
            timeout: CONFIG.gbifTimeout,
          });
        }, "gbif");

        if (!response.data || response.data.matchType === "NONE") {
          throw new ApiNotFoundError("gbif", "Species");
        }

        const speciesData = {
          key: response.data.speciesKey,
          scientificName: response.data.scientificName,
          canonicalName: response.data.canonicalName,
          rank: response.data.rank,
          status: response.data.status,
          matchType: response.data.matchType,
        };

        recordSuccess("gbif");
        return speciesData;
      } catch (error) {
        if (error instanceof ApiNotFoundError || error instanceof ApiError) {
          throw error;
        }
        recordFailure("gbif");
        if (error.response?.status === 429) {
          throw new ApiRateLimitError("gbif");
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new ApiAuthError("gbif");
        }
        if (error.response?.status === 404) {
          throw new ApiNotFoundError("gbif", "Species");
        }
        throw new ApiServerError("gbif", error.message);
      }
    });

    // Cache result
    this.memoryCache.set(cacheKey, data);
    return { data, cache: null };
  }

  // ─── GBIF Occurrences ─────────────────────────────────────────
  async getGbifOccurrences(speciesKey, limit = 500) {
    if (!speciesKey) throw new ApiError("Species key is required", 400, "gbif");

    const cacheKey = normalizeCacheKey(`gbif_occ_${speciesKey}_${limit}`);

    if (this.memoryCache.has(cacheKey)) {
      this.cacheHits.memory++;
      return { data: this.memoryCache.get(cacheKey), cache: "memory" };
    }

    if (isCircuitOpen("gbif")) {
      throw new ApiError("GBIF service temporarily unavailable", 503, "gbif");
    }

    const requestKey = `gbif_occ_${speciesKey}_${limit}`;
    const data = await deduplicate(requestKey, async () => {
      try {
        const response = await withRetry(async () => {
          return axios.get(`${GBIF_BASE_URL}/occurrence/search`, {
            params: {
              speciesKey,
              limit: parseInt(limit),
              basisOfRecord: "OBSERVATION",
            },
            timeout: CONFIG.gbifTimeout,
          });
        }, "gbif");

        const occurrences = (response.data.results || []).map((occ) => ({
          key: occ.key,
          lat: occ.decimalLatitude,
          lng: occ.decimalLongitude,
          country: occ.country,
          state: occ.stateProvince,
          locality: occ.locality,
          date: occ.eventDate,
          basis: occ.basisOfRecord,
          media: occ.media?.map((m) => ({ type: m.type, url: m.url })) || [],
        }));

        recordSuccess("gbif");
        return occurrences;
      } catch (error) {
        recordFailure("gbif");
        if (error.response?.status === 429) {
          throw new ApiRateLimitError("gbif");
        }
        if (error.response?.status === 404) {
          throw new ApiNotFoundError("gbif", "Occurrences");
        }
        throw new ApiServerError("gbif", error.message);
      }
    });

    this.memoryCache.set(cacheKey, data);
    return { data, cache: null };
  }

  // ─── IUCN Conservation Status ─────────────────────────────────
  async getIucnStatus(taxonId) {
    if (!IUCN_TOKEN) {
      throw new ApiError("IUCN API token not configured. Set IUCN_API_TOKEN in .env", 503, "iucn");
    }
    if (!taxonId) {
      throw new ApiError("Taxon ID is required", 400, "iucn");
    }

    const cacheKey = normalizeCacheKey(`iucn_${taxonId}`);

    if (this.memoryCache.has(cacheKey)) {
      this.cacheHits.memory++;
      return { data: this.memoryCache.get(cacheKey), cache: "memory" };
    }

    if (isCircuitOpen("iucn")) {
      throw new ApiError("IUCN service temporarily unavailable", 503, "iucn");
    }

    const requestKey = `iucn_${taxonId}`;
    const data = await deduplicate(requestKey, async () => {
      try {
        const response = await withRetry(async () => {
          return axios.get(`${IUCN_BASE_URL}/species/id/${taxonId}`, {
            headers: { token: IUCN_TOKEN },
            timeout: CONFIG.iucnTimeout,
          });
        }, "iucn");

        recordSuccess("iucn");
        return response.data;
      } catch (error) {
        recordFailure("iucn");
        if (error.response?.status === 401) {
          throw new ApiAuthError("iucn");
        }
        if (error.response?.status === 404) {
          throw new ApiNotFoundError("iucn", "Species");
        }
        if (error.response?.status === 429) {
          throw new ApiRateLimitError("iucn");
        }
        throw new ApiServerError("iucn", error.message);
      }
    });

    this.memoryCache.set(cacheKey, data);
    return { data, cache: null };
  }

  // ─── Combined Species Data (GBIF + IUCN) ───────────────────────
  async getCombinedSpeciesData(name, taxonId, speciesKey) {
    if (!name) throw new ApiError("Species name is required", 400, "combined");

    // Check MongoDB cache first (longest TTL)
    const mongoCached = await CachedSpecies.findOne({
      name: new RegExp(`^${name}$`, "i"),
    });
    if (mongoCached && Date.now() - mongoCached.createdAt.getTime() < CONFIG.mongoCacheTTL) {
      this.cacheHits.mongo++;
      return { data: mongoCached.data, source: "database", cache: "mongodb" };
    }

    let normalizedData = {
      name,
      scientificName: name,
      conservationStatus: "Unknown",
      taxonomy: { kingdom: null, family: null, genus: null },
      habitat: [],
      locations: [],
      source: "combined",
      lastUpdated: new Date().toISOString(),
    };

    // Try GBIF first (no auth required)
    try {
      if (speciesKey) {
        // Use provided speciesKey directly
        const gbifData = await this.searchGbifSpecies(name);
        if (gbifData.data?.key) {
          const occData = await this.getGbifOccurrences(gbifData.data.key, 50);
          normalizedData = {
            ...normalizedData,
            scientificName: gbifData.data.scientificName || name,
            gbifKey: gbifData.data.key,
            taxonomy: {
              kingdom: gbifData.data.kingdom || null,
              family: gbifData.data.family || null,
              genus: gbifData.data.genus || null,
            },
            locations: (occData.data || []).slice(0, 50).map((o) => ({
              lat: o.lat,
              lng: o.lng,
              region: o.country || o.locality || null,
            })),
            source: "GBIF",
          };
        }
      } else {
        // Search GBIF by name
        const gbifData = await this.searchGbifSpecies(name);
        if (gbifData.data?.key) {
          const occData = await this.getGbifOccurrences(gbifData.data.key, 50);
          normalizedData = {
            ...normalizedData,
            scientificName: gbifData.data.scientificName || name,
            gbifKey: gbifData.data.key,
            taxonomy: {
              kingdom: gbifData.data.kingdom || null,
              family: gbifData.data.family || null,
              genus: gbifData.data.genus || null,
            },
            locations: (occData.data || []).slice(0, 50).map((o) => ({
              lat: o.lat,
              lng: o.lng,
              region: o.country || o.locality || null,
            })),
            source: "GBIF",
          };
        }
      }
    } catch (error) {
      console.error(JSON.stringify({
        type: "GBIF_ERROR",
        service: "gbif",
        message: error.message,
        timestamp: new Date().toISOString(),
      }));
      // Graceful degradation - continue with partial data
    }

    // Try IUCN if token exists and taxonId provided
    if (IUCN_TOKEN && taxonId) {
      try {
        const iucnData = await this.getIucnStatus(taxonId);
        if (iucnData.data?.category) {
          const { normalizeConservationStatus, extractHabitat } = require("./dataNormalizer");
          normalizedData = {
            ...normalizedData,
            conservationStatus: normalizeConservationStatus(iucnData.data.category),
            iucnCategory: iucnData.data.category,
            iucnAssessmentYear: iucnData.data.assessmentYear,
            taxonid: iucnData.data.taxonid,
            habitat: extractHabitat(iucnData.data),
            source: "IUCN",
          };
        }
      } catch (error) {
        console.error(JSON.stringify({
          type: "IUCN_ERROR",
          service: "iucn",
          message: error.message,
          timestamp: new Date().toISOString(),
        }));
        // Graceful degradation - IUCN failed but we still have GBIF data
      }
    }

    normalizedData.lastUpdated = new Date().toISOString();

    // Store in MongoDB for future requests
    try {
      await CachedSpecies.findOneAndUpdate(
        { name: new RegExp(`^${name}$`, "i") },
        { name, data: normalizedData, createdAt: new Date() },
        { upsert: true }
      );
    } catch (error) {
      console.error(JSON.stringify({
        type: "MONGODB_CACHE_ERROR",
        message: error.message,
        timestamp: new Date().toISOString(),
      }));
    }

    return { data: normalizedData, source: "external", cache: null };
  }

  // ─── Species by Country ───────────────────────────────────────
  async getSpeciesByCountry(countryCode, limit = 500) {
    if (!countryCode) throw new ApiError("Country code is required", 400, "gbif");

    const cacheKey = normalizeCacheKey(`gbif_country_${countryCode}_${limit}`);

    if (this.memoryCache.has(cacheKey)) {
      this.cacheHits.memory++;
      return { data: this.memoryCache.get(cacheKey), cache: "memory" };
    }

    if (isCircuitOpen("gbif")) {
      throw new ApiError("GBIF service temporarily unavailable", 503, "gbif");
    }

    const requestKey = `gbif_country_${countryCode}_${limit}`;
    const data = await deduplicate(requestKey, async () => {
      try {
        const response = await withRetry(async () => {
          return axios.get(`${GBIF_BASE_URL}/species/search`, {
            params: {
              country: countryCode,
              limit: parseInt(limit),
              status: "ACCEPTED",
            },
            timeout: CONFIG.gbifTimeout,
          });
        }, "gbif");

        const species = (response.data.results || []).map((s) => ({
          key: s.key,
          scientificName: s.scientificName,
          canonicalName: s.canonicalName,
          rank: s.rank,
          status: s.status,
        }));

        recordSuccess("gbif");
        return species;
      } catch (error) {
        recordFailure("gbif");
        if (error.response?.status === 429) {
          throw new ApiRateLimitError("gbif");
        }
        throw new ApiServerError("gbif", error.message);
      }
    });

    this.memoryCache.set(cacheKey, data);
    return { data, cache: null };
  }

  // ─── Get Live Data (bypass cache) ─────────────────────────────
  async getLiveSpeciesData(name) {
    if (!name) throw new ApiError("Species name is required", 400, "gbif");

    // Clear from caches to force live fetch
    const cacheKey = normalizeCacheKey(`gbif_search_${name}`);
    this.memoryCache.cache.delete(cacheKey);

    // Delete from MongoDB cache
    await CachedSpecies.deleteOne({ name: new RegExp(`^${name}$`, "i") });

    // Fetch fresh data
    return this.searchGbifSpecies(name);
  }

  // ─── Cache Statistics ─────────────────────────────────────────
  getCacheStats() {
    const memoryStats = this.memoryCache.getStats();
    return {
      memory: memoryStats,
      circuitBreakers: {
        gbif: {
          failures: circuitBreakers.gbif.failures,
          isOpen: circuitBreakers.gbif.isOpen,
          nextAttempt: circuitBreakers.gbif.isOpen
            ? new Date(circuitBreakers.gbif.nextAttempt).toISOString()
            : null,
        },
        iucn: {
          failures: circuitBreakers.iucn.failures,
          isOpen: circuitBreakers.iucn.isOpen,
          nextAttempt: circuitBreakers.iucn.isOpen
            ? new Date(circuitBreakers.iucn.nextAttempt).toISOString()
            : null,
        },
      },
    };
  }

  // ─── Clear Memory Cache ────────────────────────────────────────
  clearMemoryCache() {
    this.memoryCache.clear();
  }

  // ─── Warm Cache ────────────────────────────────────────────────
  async warmCache(speciesNames) {
    const results = { success: [], failed: [] };
    for (const name of speciesNames) {
      try {
        await this.searchGbifSpecies(name);
        results.success.push(name);
      } catch (error) {
        results.failed.push({ name, error: error.message });
      }
    }
    return results;
  }
}

// ─── Export Singleton ────────────────────────────────────────────
const externalDataService = new ExternalDataService();
module.exports = {
  externalDataService,
  ExternalDataService,
  ApiError,
  ApiRateLimitError,
  ApiAuthError,
  ApiNotFoundError,
  ApiServerError,
};
