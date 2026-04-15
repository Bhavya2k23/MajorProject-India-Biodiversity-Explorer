/**
 * Species Data Service
 * Multi-source approach for species data with Wikipedia as primary source
 * Format: { commonName, scientificName, image, description, conservationStatus, source }
 */

const axios = require("axios");
const path = require("path");
const fs = require("fs");

// ─── Configuration ────────────────────────────────────────────────
const WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php";
const WIKIMEDIA_REST_URL = "https://en.wikipedia.org/api/rest_v1";
const WIKIMEDIA_BASE_URL = "https://commons.wikimedia.org";

// Load backup data for fallback
let backupData = null;
const loadBackupData = () => {
  if (backupData) return backupData;
  try {
    const backupPath = path.join(__dirname, "../data/speciesBackup.json");
    if (fs.existsSync(backupPath)) {
      const raw = fs.readFileSync(backupPath, "utf8");
      backupData = JSON.parse(raw);
      console.log(`[SpeciesData] Loaded ${backupData.species.length} backup species`);
    }
  } catch (err) {
    console.warn("[SpeciesData] Failed to load backup data:", err.message);
  }
  return backupData;
};

// ─── Conservation Status Mapping ──────────────────────────────────
const IUCN_STATUS_MAP = {
  EX: "Extinct",
  EW: "Extinct in Wild",
  CR: "Critically Endangered",
  EN: "Endangered",
  VU: "Vulnerable",
  NT: "Near Threatened",
  LC: "Least Concern",
  DD: "Data Deficient",
  NE: "Not Evaluated",
};

const CONFIG = {
  timeout: 8000,
  maxRetries: 2,
};

// ─── In-memory cache ──────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ─── Helper: Normalize species name ───────────────────────────────
const normalizeSpeciesName = (name) => {
  if (!name) return "";
  // Remove author citations like "(O.F.Müller, 1785)"
  return name.replace(/\s*\([^)]+\)/g, "").trim();
};

// ─── Helper: Check if name looks like scientific name ─────────────
const looksLikeScientificName = (name) => {
  if (!name) return false;
  // Scientific names typically have two words: genus species
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    // First letter capitalized, second part lowercase
    return /^[A-Z][a-z]+/.test(parts[0]) && /^[a-z]+/.test(parts[1]);
  }
  return false;
};

// ─── Helper: Extract best image from Wikipedia data ─────────────
const extractWikipediaImage = (data) => {
  // Try thumbnail first
  if (data.thumbnail?.source) {
    return {
      url: data.thumbnail.source,
      credit: "Wikipedia Commons",
    };
  }
  // Try original image
  if (data.originalImage?.source) {
    return {
      url: data.originalImage.source,
      credit: "Wikipedia Commons",
    };
  }
  return null;
};

// ─── Helper: Clean extract text ───────────────────────────────────
const cleanExtract = (text, maxLength = 500) => {
  if (!text) return "";
  // Remove reference numbers like [1], [2]
  let cleaned = text.replace(/\[\d+\]/g, "");
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  // Truncate if needed
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength - 3) + "...";
  }
  return cleaned;
};

// ─── Main Service Class ────────────────────────────────────────────
class SpeciesDataService {
  constructor() {
    this.cache = cache;
  }

  /**
   * Get species info from Wikipedia API
   * Primary source for common names, descriptions, images
   */
  async getSpeciesInfoFromWikipedia(speciesName) {
    const cacheKey = `wiki:${speciesName.toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const searchName = normalizeSpeciesName(speciesName);

    try {
      // Step 1: Search Wikipedia
      const searchResult = await this.searchWikipedia(searchName);
      if (!searchResult) {
        return null;
      }

      // Step 2: Get page summary (most efficient for basic info + image)
      const summary = await this.getPageSummary(searchResult.title);
      if (!summary) {
        return null;
      }

      // Step 3: Try to get more details if needed
      let description = summary.extract || "";
      if (!description || description.length < 50) {
        const details = await this.getPageDetails(searchResult.pageId);
        if (details?.extract) {
          description = details.extract;
        }
      }

      const result = {
        commonName: summary.title || searchName,
        scientificName: searchResult.title || searchName,
        description: cleanExtract(description),
        image: summary.thumbnail?.source || null,
        imageCredit: "Wikipedia Commons",
        source: "wikipedia",
        pageUrl: summary.content_urls?.desktop?.page || `${WIKIMEDIA_BASE_URL}/wiki/${encodeURIComponent(searchResult.title)}`,
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;

    } catch (error) {
      console.error(JSON.stringify({
        type: "WIKIPEDIA_SPECIES_ERROR",
        species: speciesName,
        message: error.message,
        timestamp: new Date().toISOString(),
      }));
      return null;
    }
  }

  /**
   * Search Wikipedia for a species
   */
  async searchWikipedia(name) {
    try {
      const response = await axios.get(WIKIPEDIA_API_URL, {
        params: {
          action: "query",
          list: "search",
          srsearch: `${name} species OR "${name}" -disambiguation`,
          format: "json",
          origin: "*",
          srlimit: 1,
          srnamespace: 0,
        },
        timeout: CONFIG.timeout,
      });

      const results = response.data?.query?.search;
      if (!results || results.length === 0) {
        return null;
      }

      return {
        pageId: results[0].pageid,
        title: results[0].title,
        snippet: results[0].snippet,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get page summary (most efficient - single API call)
   */
  async getPageSummary(title) {
    try {
      const encodedTitle = encodeURIComponent(title.replace(/ /g, "_"));
      const response = await axios.get(
        `${WIKIMEDIA_REST_URL}/page/summary/${encodedTitle}`,
        {
          timeout: CONFIG.timeout,
          headers: {
            'User-Agent': 'IndiaBiodiversityExplorer/1.0 (biodiversity project)',
          },
        }
      );

      return response.data || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get detailed page info
   */
  async getPageDetails(pageId) {
    try {
      const response = await axios.get(WIKIPEDIA_API_URL, {
        params: {
          action: "query",
          pageids: pageId,
          prop: "extracts|pageimages|info",
          exintro: false,
          explaintext: true,
          exsentences: 5,
          piprop: "thumbnail",
          pithumbsize: 800,
          format: "json",
          origin: "*",
        },
        timeout: CONFIG.timeout,
      });

      const pages = response.data?.query?.pages;
      if (!pages || !pages[pageId]) {
        return null;
      }

      return pages[pageId];
    } catch (error) {
      return null;
    }
  }

  /**
   * Get species image from multiple sources
   * Priority: Wikipedia summary > Wikipedia full > Wikimedia Commons > Pexels > Unsplash
   */
  async getSpeciesImage(commonName, scientificName) {
    // Try Wikipedia first
    const wikiImage = await this.getImageFromWikipedia(scientificName || commonName);
    if (wikiImage) return { ...wikiImage, source: "wikipedia" };

    // Try Wikimedia Commons
    const commonsImage = await this.getImageFromCommons(scientificName || commonName);
    if (commonsImage) return { ...commonsImage, source: "wikimedia-commons" };

    // Try Pexels (if API key available)
    const pexelsImage = await this.getImageFromPexels(scientificName || commonName);
    if (pexelsImage) return { ...pexelsImage, source: "pexels" };

    // Fallback to Unsplash
    return this.getUnsplashFallback(scientificName || commonName);
  }

  /**
   * Get image from Wikipedia summary
   */
  async getImageFromWikipedia(name) {
    try {
      const summary = await this.getPageSummary(name);
      if (summary?.thumbnail?.source) {
        return {
          url: summary.thumbnail.source,
          credit: "Wikipedia Commons",
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get image from Wikimedia Commons API
   */
  async getImageFromCommons(name) {
    try {
      const response = await axios.get(
        "https://commons.wikimedia.org/w/api.php",
        {
          params: {
            action: "query",
            list: "search",
            srsearch: `${name} wildlife nature species`,
            srlimit: 5,
            format: "json",
          },
          timeout: CONFIG.timeout,
        }
      );

      const results = response.data?.query?.search;
      if (!results || results.length === 0) return null;

      // Get image for first result
      const firstResult = results[0];
      const imageInfo = await axios.get(
        "https://commons.wikimedia.org/w/api.php",
        {
          params: {
            action: "query",
            titles: firstResult.title,
            prop: "pageimages",
            pithumbsize: 800,
            format: "json",
          },
          timeout: CONFIG.timeout,
        }
      );

      const pages = imageInfo.data?.query?.pages;
      if (pages) {
        const pageId = Object.keys(pages)[0];
        if (pages[pageId]?.thumbnail?.source) {
          return {
            url: pages[pageId].thumbnail.source,
            credit: "Wikipedia Commons",
          };
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get image from Pexels API
   */
  async getImageFromPexels(name) {
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
    if (!PEXELS_API_KEY) return null;

    try {
      const response = await axios.get(
        "https://api.pexels.com/v1/search",
        {
          params: { query: `${name} wildlife`, per_page: 5 },
          headers: { Authorization: PEXELS_API_KEY },
          timeout: CONFIG.timeout,
        }
      );

      const photos = response.data?.photos;
      if (photos && photos.length > 0) {
        // Return first result, prefer landscape orientation
        const photo = photos.find(p => p.width > p.height) || photos[0];
        return {
          url: photo.src?.medium || photo.src?.original,
          credit: `Pexels - ${photo.photographer}`,
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get Unsplash fallback image
   */
  async getUnsplashFallback(name) {
    const fallbacks = [
      "https://images.unsplash.com/photo-1500829243541-74b67eeccc18?w=800&q=80",
      "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&q=80",
      "https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=800&q=80",
      "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=800&q=80",
    ];
    // Deterministic selection based on name
    const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return {
      url: fallbacks[hash % fallbacks.length],
      credit: "Unsplash",
    };
  }

  /**
   * Get combined species data from Wikipedia (primary) + backup
   * Returns unified format: { commonName, scientificName, image, description, conservationStatus, source }
   */
  async getSpeciesData(name) {
    if (!name) return null;

    // Check cache first
    const cacheKey = `species:${name.toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Try Wikipedia first
    const wikiData = await this.getSpeciesInfoFromWikipedia(name);
    if (wikiData) {
      const result = {
        commonName: wikiData.commonName,
        scientificName: wikiData.scientificName,
        description: wikiData.description,
        image: wikiData.image,
        conservationStatus: this.inferConservationStatus(wikiData.description),
        source: "wikipedia",
      };
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }

    // Fallback to backup data
    const backup = loadBackupData();
    if (backup) {
      // Try exact match first
      let species = backup.species.find(
        s => s.commonName.toLowerCase() === name.toLowerCase() ||
             s.scientificName.toLowerCase() === name.toLowerCase()
      );

      // Try partial match
      if (!species) {
        species = backup.species.find(
          s => s.commonName.toLowerCase().includes(name.toLowerCase()) ||
               s.scientificName.toLowerCase().includes(name.toLowerCase())
        );
      }

      if (species) {
        const result = {
          commonName: species.commonName,
          scientificName: species.scientificName,
          description: species.description,
          image: species.image,
          conservationStatus: species.conservationStatus,
          source: "backup",
        };
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
    }

    return null;
  }

  /**
   * Infer conservation status from description text
   * Simple heuristic - not perfect but better than "Unknown"
   */
  inferConservationStatus(description) {
    if (!description) return "Unknown";
    const desc = description.toLowerCase();

    const statusIndicators = {
      "critically endangered": ["critically endangered", "near extinction", "fewer than 100"],
      "endangered": ["endangered", "threatened", "declining", "vulnerable"],
      "vulnerable": ["vulnerable", "at risk", "declining population"],
      "near threatened": ["near threatened", "close to threatened"],
      "least concern": ["least concern", "common", "widespread", "abundant"],
    };

    for (const [status, indicators] of Object.entries(statusIndicators)) {
      if (indicators.some(indicator => desc.includes(indicator))) {
        return status.charAt(0).toUpperCase() + status.slice(1);
      }
    }

    return "Unknown";
  }

  /**
   * Batch fetch species data
   */
  async getBatchSpeciesData(names) {
    const results = [];
    for (const name of names) {
      try {
        const data = await this.getSpeciesData(name);
        if (data) {
          results.push(data);
        }
      } catch (error) {
        // Continue with next species
      }
      // Rate limit to avoid overwhelming APIs
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return results;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()).slice(0, 10),
    };
  }
}

// ─── Export Singleton ──────────────────────────────────────────────
const speciesDataService = new SpeciesDataService();
module.exports = { speciesDataService, SpeciesDataService };