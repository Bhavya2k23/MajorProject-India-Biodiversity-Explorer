/**
 * Species Image Service
 * Multi-source fallback system for species images
 * Priority: Unsplash → Pexels → Wikimedia Commons → Local JSON Backup
 *
 * Features:
 * - TTL-based caching (30 minutes for successful lookups)
 * - Image URL validation before returning
 * - Graceful API failure handling with circuit breakers
 * - Rate limiting compliance
 * - Environment-based API keys (UNSPLASH_ACCESS_KEY, PEXELS_API_KEY)
 */

const axios = require("axios");
const path = require("path");
const fs = require("fs");

// ─── Configuration ────────────────────────────────────────────────
const UNSPLASH_API = "https://api.unsplash.com";
const PEXELS_API = "https://api.pexels.com/v1";
const WIKIMEDIA_COMMONS_API = "https://commons.wikimedia.org/w/api.php";

const CONFIG = {
  timeout: 8000,
  maxRetries: 2,
  imageTTL: 30 * 60 * 1000, // 30 minutes cache for image URLs
  maxCacheEntries: 1000,
};

// ─── Circuit Breaker State ───────────────────────────────────────
const circuitBreakers = {
  unsplash: { failures: 0, isOpen: false, nextAttempt: 0 },
  pexels: { failures: 0, isOpen: false, nextAttempt: 0 },
  wikimedia: { failures: 0, isOpen: false, nextAttempt: 0 },
};

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_RESET_MS = 60 * 1000;

// ─── In-Memory Cache for Image URLs ──────────────────────────────
const imageCache = new Map();
let cacheHits = 0;
let cacheMisses = 0;

// ─── Load Local Backup Data ──────────────────────────────────────
let backupData = null;
const loadBackupData = () => {
  if (backupData) return backupData;
  try {
    const backupPath = path.join(__dirname, "../data/speciesImageBackup.json");
    if (fs.existsSync(backupPath)) {
      const raw = fs.readFileSync(backupPath, "utf8");
      backupData = JSON.parse(raw);
      console.log(`[SpeciesImage] Loaded ${backupData.images?.length || 0} backup images`);
    } else {
      console.warn("[SpeciesImage] No backup image file found at data/speciesImageBackup.json");
    }
  } catch (err) {
    console.warn("[SpeciesImage] Failed to load backup image data:", err.message);
  }
  return backupData;
};

// ─── Helper: Check circuit breaker ──────────────────────────────
const isCircuitOpen = (service) => {
  const cb = circuitBreakers[service];
  if (!cb.isOpen) return false;
  if (Date.now() > cb.nextAttempt) {
    cb.isOpen = false;
    cb.failures = 0;
    return false;
  }
  return true;
};

const tripCircuit = (service) => {
  circuitBreakers[service].failures++;
  if (circuitBreakers[service].failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreakers[service].isOpen = true;
    circuitBreakers[service].nextAttempt = Date.now() + CIRCUIT_BREAKER_RESET_MS;
    console.warn(`[SpeciesImage] Circuit breaker opened for ${service}`);
  }
};

const resetCircuit = (service) => {
  circuitBreakers[service].failures = 0;
  circuitBreakers[service].isOpen = false;
};

// ─── Helper: Exponential backoff ────────────────────────────────
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Helper: Validate image URL ──────────────────────────────────
const validateImageUrl = async (url, timeout = 5000) => {
  if (!url || typeof url !== "string") return false;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;

  try {
    const response = await axios.head(url, { timeout });
    const contentType = response.headers["content-type"];
    return response.status === 200 && contentType?.startsWith("image/");
  } catch {
    return false;
  }
};

// ─── Helper: Hash string for deterministic fallback selection ─────
const stringHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// ─── Helper: Get search terms from species names ─────────────────
const getSearchTerms = (commonName, scientificName) => {
  const terms = [];

  // Scientific name is usually more precise for image search
  if (scientificName) {
    // Clean up subspecies notations for better search results
    const cleanSciName = scientificName.replace(/\s+[a-z]+\.$/, "").trim();
    terms.push(cleanSciName);

    // Try just genus + species (first two words)
    const genusSpecies = cleanSciName.split(" ").slice(0, 2).join(" ");
    if (genusSpecies !== cleanSciName) {
      terms.push(genusSpecies);
    }
  }

  // Add common name variations
  if (commonName) {
    terms.push(commonName);
    // Add "wildlife" or "animal" suffix for better results
    terms.push(`${commonName} wildlife`);
    terms.push(`${commonName} nature`);
  }

  return [...new Set(terms)]; // Remove duplicates
};

// ─── Source 1: Unsplash ──────────────────────────────────────────
const fetchFromUnsplash = async (commonName, scientificName) => {
  if (isCircuitOpen("unsplash")) return null;

  const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
  if (!UNSPLASH_ACCESS_KEY) {
    console.debug("[SpeciesImage] Unsplash API key not configured");
    return null;
  }

  const searchTerms = getSearchTerms(commonName, scientificName);

  for (const term of searchTerms) {
    for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
      try {
        const response = await axios.get(`${UNSPLASH_API}/search/photos`, {
          params: {
            query: term,
            per_page: 10,
            orientation: "landscape",
          },
          headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          },
          timeout: CONFIG.timeout,
        });

        const photos = response.data?.results;
        if (photos && photos.length > 0) {
          // Pick a deterministic photo based on the species name
          const photoIndex = stringHash(`${commonName}${scientificName}`) % photos.length;
          const photo = photos[photoIndex];

          return {
            url: photo.urls?.regular || photo.urls?.small || photo.src?.original,
            credit: `Unsplash - ${photo.user?.name || "Unknown Photographer"}`,
            source: "unsplash",
            attributionUrl: photo.user?.links?.html || "https://unsplash.com",
          };
        }
        break; // No results for this term, try next
      } catch (error) {
        const status = error.response?.status;

        // 429 = rate limited, don't count as failure but wait
        if (status === 429) {
          console.warn(`[SpeciesImage] Unsplash rate limited, waiting...`);
          await delay(Math.min(2000 * Math.pow(2, attempt), 10000));
          continue;
        }

        // Auth error - don't retry
        if (status === 401 || status === 403) {
          console.error("[SpeciesImage] Unsplash API authentication failed");
          tripCircuit("unsplash");
          return null;
        }

        const isLastAttempt = attempt === CONFIG.maxRetries;
        if (isLastAttempt) {
          tripCircuit("unsplash");
          break;
        }

        await delay(Math.min(1000 * Math.pow(2, attempt), 5000));
      }
    }
  }

  return null;
};

// ─── Source 2: Pexels ────────────────────────────────────────────
const fetchFromPexels = async (commonName, scientificName) => {
  if (isCircuitOpen("pexels")) return null;

  const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
  if (!PEXELS_API_KEY) {
    console.debug("[SpeciesImage] Pexels API key not configured");
    return null;
  }

  const searchTerms = getSearchTerms(commonName, scientificName);

  for (const term of searchTerms) {
    for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
      try {
        const response = await axios.get(`${PEXELS_API}/search`, {
          params: {
            query: term,
            per_page: 15,
            orientation: "landscape",
          },
          headers: {
            Authorization: PEXELS_API_KEY,
          },
          timeout: CONFIG.timeout,
        });

        const photos = response.data?.photos;
        if (photos && photos.length > 0) {
          // Pick a deterministic photo
          const photoIndex = stringHash(`${scientificName}${commonName}`) % photos.length;
          const photo = photos[photoIndex];

          return {
            url: photo.src?.large2x || photo.src?.large || photo.src?.medium,
            credit: `Pexels - ${photo.photographer}`,
            source: "pexels",
            attributionUrl: photo.photographer_url || "https://pexels.com",
          };
        }
        break;
      } catch (error) {
        const status = error.response?.status;

        if (status === 429) {
          console.warn(`[SpeciesImage] Pexels rate limited, waiting...`);
          await delay(Math.min(2000 * Math.pow(2, attempt), 10000));
          continue;
        }

        if (status === 401 || status === 403) {
          console.error("[SpeciesImage] Pexels API authentication failed");
          tripCircuit("pexels");
          return null;
        }

        const isLastAttempt = attempt === CONFIG.maxRetries;
        if (isLastAttempt) {
          tripCircuit("pexels");
          break;
        }

        await delay(Math.min(1000 * Math.pow(2, attempt), 5000));
      }
    }
  }

  return null;
};

// ─── Source 3: Wikimedia Commons ────────────────────────────────
const fetchFromWikimedia = async (commonName, scientificName) => {
  if (isCircuitOpen("wikimedia")) return null;

  const searchTerms = getSearchTerms(commonName, scientificName);

  for (const term of searchTerms) {
    for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
      try {
        // Step 1: Search for relevant pages
        const searchResponse = await axios.get(WIKIMEDIA_COMMONS_API, {
          params: {
            action: "query",
            list: "search",
            srsearch: `${term} species wildlife nature`,
            srlimit: 5,
            format: "json",
            origin: "*",
          },
          timeout: CONFIG.timeout,
        });

        const searchResults = searchResponse.data?.query?.search;
        if (!searchResults || searchResults.length === 0) continue;

        // Step 2: Get thumbnail for best result
        for (const result of searchResults) {
          const imageResponse = await axios.get(WIKIMEDIA_COMMONS_API, {
            params: {
              action: "query",
              titles: result.title,
              prop: "pageimages",
              pithumbsize: 1200,
              format: "json",
              origin: "*",
            },
            timeout: CONFIG.timeout,
          });

          const pages = imageResponse.data?.query?.pages;
          if (pages) {
            const pageId = Object.keys(pages)[0];
            const page = pages[pageId];

            if (page?.thumbnail?.source) {
              return {
                url: page.thumbnail.source,
                credit: `Wikimedia Commons - ${result.title}`,
                source: "wikimedia-commons",
                attributionUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(result.title)}`,
              };
            }
          }
        }

        break; // Try next term
      } catch (error) {
        const status = error.response?.status;
        const isLastAttempt = attempt === CONFIG.maxRetries;

        if (isLastAttempt) {
          tripCircuit("wikimedia");
          break;
        }

        await delay(Math.min(1000 * Math.pow(2, attempt), 5000));
      }
    }
  }

  return null;
};

// ─── Source 4: Local JSON Backup ──────────────────────────────────
const fetchFromBackup = (commonName, scientificName) => {
  const backup = loadBackupData();
  if (!backup || !backup.images) return null;

  const cleanSciName = scientificName?.replace(/\s+[a-z]+\.$/, "").trim() || "";
  const genusSpecies = cleanSciName.split(" ").slice(0, 2).join(" ");

  // Search by scientific name first, then common name
  let match = backup.images.find(img => {
    const imgSci = img.scientificName?.replace(/\s+[a-z]+\.$/, "").trim() || "";
    return imgSci === cleanSciName || imgSci === genusSpecies;
  });

  if (!match) {
    match = backup.images.find(img =>
      img.commonName?.toLowerCase() === commonName?.toLowerCase()
    );
  }

  if (!match && scientificName) {
    // Partial match on scientific name
    match = backup.images.find(img =>
      img.scientificName?.toLowerCase().includes(scientificName?.toLowerCase().split(" ")[0])
    );
  }

  if (match) {
    return {
      url: match.url,
      credit: match.credit || "Local Backup",
      source: "backup",
      attributionUrl: match.attributionUrl || null,
    };
  }

  return null;
};

// ─── Source 5: Static Fallback Images ────────────────────────────
const STATIC_FALLBACKS = {
  Mammal: [
    { url: "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=1200&q=80", credit: "Unsplash" },
    { url: "https://images.unsplash.com/photo-1606189934846-a527add8a77b?w=1200&q=80", credit: "Unsplash" },
  ],
  Bird: [
    { url: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=1200&q=80", credit: "Unsplash" },
    { url: "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=1200&q=80", credit: "Unsplash" },
  ],
  Reptile: [
    { url: "https://images.unsplash.com/photo-1504450874802-0ba2dcd659e0?w=1200&q=80", credit: "Unsplash" },
    { url: "https://images.unsplash.com/photo-1531386151447-fd76ad50012f?w=1200&q=80", credit: "Unsplash" },
  ],
  Amphibian: [
    { url: "https://images.unsplash.com/photo-1559253664-ca249d7b4b58?w=1200&q=80", credit: "Unsplash" },
    { url: "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=1200&q=80", credit: "Unsplash" },
  ],
  Fish: [
    { url: "https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=1200&q=80", credit: "Unsplash" },
    { url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80", credit: "Unsplash" },
  ],
  Insect: [
    { url: "https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=1200&q=80", credit: "Unsplash" },
    { url: "https://images.unsplash.com/photo-1473654729523-203e25dfda10?w=1200&q=80", credit: "Unsplash" },
  ],
  Plant: [
    { url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80", credit: "Unsplash" },
    { url: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1200&q=80", credit: "Unsplash" },
  ],
  default: [
    { url: "https://images.unsplash.com/photo-1500829243541-74b67eeccc18?w=1200&q=80", credit: "Unsplash" },
    { url: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=1200&q=80", credit: "Unsplash" },
    { url: "https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=1200&q=80", credit: "Unsplash" },
  ],
};

const getStaticFallback = (type, seed) => {
  const fallbacks = STATIC_FALLBACKS[type] || STATIC_FALLBACKS.default;
  const index = stringHash(seed) % fallbacks.length;
  const selected = fallbacks[index];
  return {
    url: selected.url,
    credit: selected.credit,
    source: "fallback",
    attributionUrl: "https://unsplash.com",
  };
};

// ─── Main Function: Get Species Image ──────────────────────────
/**
 * Get species image with multi-source fallback
 * @param {string} commonName - Common species name
 * @param {string} scientificName - Scientific species name
 * @param {string} type - Species type for fallback selection
 * @param {boolean} validate - Whether to validate URL before returning
 * @returns {Promise<{url, credit, source, attributionUrl}|null>}
 */
const getSpeciesImage = async (commonName, scientificName, type = null, validate = true) => {
  const cacheKey = `img:${(scientificName || commonName).toLowerCase().trim()}`;

  // Check cache first
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CONFIG.imageTTL) {
    cacheHits++;
    return cached.data;
  }
  cacheMisses++;

  let result = null;
  const sourcesAttempted = [];

  // Source 1: Unsplash (API-based, most reliable)
  const unsplashResult = await fetchFromUnsplash(commonName, scientificName);
  if (unsplashResult) {
    if (!validate || await validateImageUrl(unsplashResult.url)) {
      result = unsplashResult;
      sourcesAttempted.push("unsplash");
    }
  }

  // Source 2: Pexels (API-based, good quality)
  if (!result) {
    const pexelsResult = await fetchFromPexels(commonName, scientificName);
    if (pexelsResult) {
      if (!validate || await validateImageUrl(pexelsResult.url)) {
        result = pexelsResult;
        sourcesAttempted.push("pexels");
      }
    }
  }

  // Source 3: Wikimedia Commons (free, large database)
  if (!result) {
    const wikimediaResult = await fetchFromWikimedia(commonName, scientificName);
    if (wikimediaResult) {
      if (!validate || await validateImageUrl(wikimediaResult.url)) {
        result = wikimediaResult;
        sourcesAttempted.push("wikimedia-commons");
      }
    }
  }

  // Source 4: Local JSON Backup (offline fallback)
  if (!result) {
    const backupResult = fetchFromBackup(commonName, scientificName);
    if (backupResult) {
      if (!validate || await validateImageUrl(backupResult.url)) {
        result = backupResult;
        sourcesAttempted.push("backup");
      }
    }
  }

  // Source 5: Static Fallback (always available)
  if (!result) {
    const seed = `${commonName}${scientificName}`;
    result = getStaticFallback(type, seed);
    sourcesAttempted.push("static-fallback");
  }

  // Cache the result
  imageCache.set(cacheKey, { data: result, timestamp: Date.now() });

  // Log the fetch
  console.log(JSON.stringify({
    type: "SPECIES_IMAGE_FETCH",
    commonName,
    scientificName,
    sourcesAttempted,
    finalSource: result?.source,
    cached: !!cached,
    timestamp: new Date().toISOString(),
  }));

  // Cleanup cache if too large
  if (imageCache.size > CONFIG.maxCacheEntries) {
    const oldestKeys = [...imageCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, 100)
      .map(([k]) => k);
    oldestKeys.forEach(k => imageCache.delete(k));
  }

  return result;
};

// ─── Batch fetch for multiple species ────────────────────────────
const batchGetSpeciesImages = async (speciesList, validate = false) => {
  const results = {};

  for (const species of speciesList) {
    try {
      const image = await getSpeciesImage(
        species.commonName,
        species.scientificName,
        species.type,
        validate
      );
      if (image) {
        results[species.id || species._id] = image;
      }
    } catch (error) {
      // Continue with next species
      console.warn(`[SpeciesImage] Batch fetch failed for ${species.commonName}: ${error.message}`);
    }

    // Rate limit to avoid overwhelming APIs
    await delay(200);
  }

  return results;
};

// ─── Cache Management ────────────────────────────────────────────
const clearImageCache = () => {
  imageCache.clear();
  console.log("[SpeciesImage] Image cache cleared");
};

const getImageCacheStats = () => {
  return {
    size: imageCache.size,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: cacheHits + cacheMisses > 0
      ? `${((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(1)}%`
      : "0%",
    circuits: {
      unsplash: circuitBreakers.unsplash,
      pexels: circuitBreakers.pexels,
      wikimedia: circuitBreakers.wikimedia,
    },
  };
};

const resetCircuits = () => {
  Object.keys(circuitBreakers).forEach(service => resetCircuit(service));
  console.log("[SpeciesImage] All circuit breakers reset");
};

// ─── Module Exports ───────────────────────────────────────────────
module.exports = {
  getSpeciesImage,
  batchGetSpeciesImages,
  validateImageUrl,
  clearImageCache,
  getImageCacheStats,
  resetCircuits,
  // Exported for testing
  fetchFromUnsplash,
  fetchFromPexels,
  fetchFromWikimedia,
  fetchFromBackup,
  getStaticFallback,
};