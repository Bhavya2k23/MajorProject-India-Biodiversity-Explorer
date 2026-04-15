/**
 * Wikipedia Service
 * Provides species information from Wikipedia/Wikimedia API
 * Primary source for: common names, descriptions, images
 */

const axios = require("axios");
const path = require("path");
const fs = require("fs");

// ─── Configuration ────────────────────────────────────────────────
const WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php";
const WIKIMEDIA_BASE_URL = "https://commons.wikimedia.org";

const CONFIG = {
  timeout: 8000,
  maxRetries: 2,
};

// ─── Cache for species data from Wikipedia ──────────────────────────
const wikipediaCache = new Map();

// ─── Helper: Normalize species name for Wikipedia search ──────────────
const normalizeForWikipedia = (name) => {
  if (!name) return "";

  // Remove author citations like "(O.F.Müller, 1785)"
  let normalized = name.replace(/\s*\([^)]+\)/g, "").trim();

  // If it looks like a scientific name (has genus/species), try to get common name
  // Otherwise use as-is

  return normalized;
};

// ─── Helper: Extract image URL from page data ────────────────────────
const extractImageUrl = (pageData) => {
  if (!pageData?.thumbnail?.source) return null;
  return pageData.thumbnail.source;
};

// ─── Helper: Extract description from extract ───────────────────────
const extractDescription = (extract, maxLength = 500) => {
  if (!extract) return "";
  // Clean up the extract
  let cleaned = extract
    .replace(/\s+/g, " ")
    .trim();
  // Truncate if too long
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength - 3) + "...";
  }
  return cleaned;
};

// ─── Main Service ────────────────────────────────────────────────────
class WikipediaService {
  constructor() {
    this.cache = wikipediaCache;
  }

  /**
   * Search Wikipedia for a species and get basic info
   * @param {string} name - Species name (common or scientific)
   * @returns {Promise<{commonName, description, image, pageId}>}
   */
  async getSpeciesInfo(name) {
    if (!name) throw new Error("Species name is required");

    // Check cache first
    const cacheKey = name.toLowerCase().trim();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const searchName = normalizeForWikipedia(name);

    try {
      // Step 1: Search Wikipedia for the species
      const searchResult = await this.searchWikipedia(searchName);
      if (!searchResult) {
        return null;
      }

      // Step 2: Get page details with image
      const pageDetails = await this.getPageDetails(searchResult.pageId, searchResult.title);

      const result = {
        commonName: searchResult.commonName || searchName,
        scientificName: searchResult.title,
        description: pageDetails.description,
        image: pageDetails.image,
        imageCredit: pageDetails.imageCredit,
        pageId: searchResult.pageId,
        wikiUrl: `${WIKIMEDIA_BASE_URL}/wiki/${encodeURIComponent(searchResult.title)}`,
        source: "wikipedia",
      };

      // Cache the result
      this.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error(JSON.stringify({
        type: "WIKIPEDIA_ERROR",
        message: error.message,
        species: name,
        timestamp: new Date().toISOString(),
      }));
      return null;
    }
  }

  /**
   * Search Wikipedia for a species page
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

      const searchResults = response.data?.query?.search;
      if (!searchResults || searchResults.length === 0) {
        return null;
      }

      const bestMatch = searchResults[0];
      return {
        pageId: bestMatch.pageid,
        title: bestMatch.title,
        snippet: bestMatch.snippet,
        // Try to extract a common name from the page title or snippet
        commonName: this.extractCommonName(bestMatch.title, bestMatch.snippet),
      };

    } catch (error) {
      console.error(JSON.stringify({
        type: "WIKIPEDIA_SEARCH_ERROR",
        message: error.message,
        name,
        timestamp: new Date().toISOString(),
      }));
      return null;
    }
  }

  /**
   * Get detailed page info including thumbnail image
   */
  async getPageDetails(pageId, title) {
    try {
      // First try to get details with image
      const response = await axios.get(WIKIPEDIA_API_URL, {
        params: {
          action: "query",
          pageids: pageId,
          prop: "extracts|pageimages|info",
          exintro: true,
          explaintext: true,
          exsentences: 3,
          piprop: "thumbnail",
          pithumbsize: 800,
          format: "json",
          origin: "*",
        },
        timeout: CONFIG.timeout,
      });

      const pages = response.data?.query?.pages;
      if (!pages || !pages[pageId]) {
        return { description: "", image: null };
      }

      const page = pages[pageId];

      // Get image from pageimages or from the title
      let image = extractImageUrl(page);
      let imageCredit = "Wikipedia Commons";

      // If no image, try to find one from page images
      if (!image) {
        const imageResult = await this.getPageImage(title);
        image = imageResult?.image;
        imageCredit = imageResult?.credit || "Wikipedia Commons";
      }

      return {
        description: extractDescription(page.extract),
        image,
        imageCredit,
        wikiUrl: page.fullurl,
      };

    } catch (error) {
      console.error(JSON.stringify({
        type: "WIKIPEDIA_PAGE_ERROR",
        message: error.message,
        pageId,
        timestamp: new Date().toISOString(),
      }));
      return { description: "", image: null };
    }
  }

  /**
   * Get an image for a page from Wikipedia
   */
  async getPageImage(title) {
    try {
      // Search for images on the page
      const response = await axios.get(WIKIPEDIA_API_URL, {
        params: {
          action: "query",
          titles: title,
          prop: "images",
          imlimit: 10,
          format: "json",
          origin: "*",
        },
        timeout: CONFIG.timeout,
      });

      const pages = response.data?.query?.pages;
      if (!pages) return null;

      const pageId = Object.keys(pages)[0];
      const images = pages[pageId]?.images || [];

      // Filter for actual image files (not icons, etc.)
      const validExtensions = [".jpg", ".jpeg", ".png", ".webp"];
      for (const img of images) {
        const name = img.title.toLowerCase();
        const hasValidExt = validExtensions.some(ext => name.endsWith(ext));
        const isNotIcon = !name.includes("icon") && !name.includes("stub");

        if (hasValidExt && isNotIcon) {
          // Get the image URL
          const imgUrl = await this.getImageUrl(img.title);
          if (imgUrl) {
            return {
              image: imgUrl,
              credit: "Wikipedia Commons",
            };
          }
        }
      }

      return null;

    } catch (error) {
      return null;
    }
  }

  /**
   * Get direct URL for an image
   */
  async getImageUrl(imageTitle) {
    try {
      const response = await axios.get(WIKIPEDIA_API_URL, {
        params: {
          action: "query",
          titles: imageTitle,
          prop: "imageinfo",
          iiprop: "url",
          iiurlwidth: 800,
          format: "json",
          origin: "*",
        },
        timeout: CONFIG.timeout,
      });

      const pages = response.data?.query?.pages;
      if (!pages) return null;

      const pageId = Object.keys(pages)[0];
      const imageinfo = pages[pageId]?.imageinfo?.[0];

      return imageinfo?.thumburl || imageinfo?.url || null;

    } catch (error) {
      return null;
    }
  }

  /**
   * Extract a common name from Wikipedia title/snippet
   */
  extractCommonName(title, snippet) {
    // Try to extract common name patterns
    // Common pattern: "Common name (scientific name)" or just "Scientific name"

    // Remove HTML tags from snippet
    const cleanSnippet = snippet?.replace(/<[^>]+>/g, "").trim() || "";

    // Check if title looks like a scientific name (italicized genus + species)
    // If not, the title itself might be the common name
    const looksLikeScientific = /^[A-Z][a-z]+\s+[a-z]+/.test(title);

    if (!looksLikeScientific) {
      return title;
    }

    // Try to find common name in snippet (often in quotes or parentheses)
    const commonNameMatch = cleanSnippet.match(/"([^"]+)"|\(([^)]+)\)|([A-Z][a-z]+\s+[a-z]+)/);
    if (commonNameMatch) {
      const match = commonNameMatch[1] || commonNameMatch[2] || commonNameMatch[3];
      if (match && match.toLowerCase() !== title.toLowerCase()) {
        return match;
      }
    }

    // Fallback: use the genus name as a pseudo-common name
    const genus = title.split(" ")[0];
    return genus;
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
    };
  }
}

// ─── Export singleton ────────────────────────────────────────────────
const wikipediaService = new WikipediaService();
module.exports = { wikipediaService, WikipediaService };