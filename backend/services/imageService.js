/**
 * Image Fetching Service
 * Fetches species images from Wikipedia/Wikimedia and Unsplash
 * Used for auto-filling missing species images
 */

const axios = require("axios");

const WIKIPEDIA_API = "https://en.wikipedia.org/api/rest_v1";
const UNSPLASH_API = "https://api.unsplash.com";

// Note: For Unsplash, you would need an API key
// For now, we primarily use Wikipedia which is free and has excellent wildlife coverage

/**
 * Search Wikipedia for species images
 * @param {string} speciesName - The species name to search for
 * @returns {Promise<string|null>} - Image URL or null if not found
 */
const fetchWikipediaImage = async (speciesName) => {
  try {
    // First try to get the Wikipedia page summary which often has an image
    const encodedName = encodeURIComponent(speciesName.replace(/ /g, "_"));
    const response = await axios.get(
      `${WIKIPEDIA_API}/page/summary/${encodedName}`,
      {
        timeout: 8000,
        headers: {
          'User-Agent': 'IndiaBiodiversityExplorer/1.0 (biodiversity project)',
        },
      }
    );

    if (response.data?.thumbnail?.source) {
      // Return the thumbnail URL (it's a valid, accessible image)
      return response.data.thumbnail.source;
    }

    if (response.data?.originalImage?.source) {
      return response.data.originalImage.source;
    }

    return null;
  } catch (error) {
    if (error.response?.status === 404) {
      return null; // Species not found on Wikipedia
    }
    console.error(JSON.stringify({
      type: "WIKIPEDIA_IMAGE_FETCH_ERROR",
      speciesName,
      message: error.message,
      timestamp: new Date().toISOString(),
    }));
    return null;
  }
};

/**
 * Search Wikimedia Commons for species images
 * @param {string} speciesName - The species name to search for
 * @param {string} scientificName - Optional scientific name for better results
 * @returns {Promise<string|null>} - Image URL or null if not found
 */
const fetchWikimediaCommonsImage = async (speciesName, scientificName) => {
  try {
    // Use Wikimedia Commons API to search for images
    const searchTerms = scientificName
      ? [scientificName, speciesName]
      : [speciesName];

    for (const term of searchTerms) {
      const response = await axios.get(
        "https://commons.wikimedia.org/w/api.php",
        {
          params: {
            action: "query",
            list: "search",
            srsearch: `${term} wildlife nature`,
            srlimit: 5,
            format: "json",
          },
          timeout: 8000,
          headers: {
            'User-Agent': 'IndiaBiodiversityExplorer/1.0',
          },
        }
      );

      if (response.data?.query?.search?.length > 0) {
        // Get image info for the first result
        const firstResult = response.data.query.search[0];
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
            timeout: 8000,
          }
        );

        const pages = imageInfo.data?.query?.pages;
        if (pages) {
          const pageId = Object.keys(pages)[0];
          if (pages[pageId]?.thumbnail?.source) {
            return pages[pageId].thumbnail.source;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error(JSON.stringify({
      type: "WIKIMEDIA_COMMONS_FETCH_ERROR",
      speciesName,
      message: error.message,
      timestamp: new Date().toISOString(),
    }));
    return null;
  }
};

/**
 * Try to get an image for a species from multiple sources
 * @param {string} commonName - Common name of the species
 * @param {string} scientificName - Scientific name of the species
 * @returns {Promise<string|null>} - Best available image URL
 */
const fetchSpeciesImage = async (commonName, scientificName) => {
  // Try Wikipedia first (usually has good wildlife images)
  let imageUrl = await fetchWikipediaImage(scientificName || commonName);

  if (!imageUrl) {
    // Fallback to Wikimedia Commons
    imageUrl = await fetchWikimediaCommonsImage(commonName, scientificName);
  }

  return imageUrl;
};

/**
 * Batch fetch images for multiple species
 * @param {Array<{name: string, scientificName: string, _id: string}>} speciesArray
 * @returns {Promise<Object>} - Map of species IDs to image URLs
 */
const batchFetchImages = async (speciesArray) => {
  const results = {};
  const errors = [];

  for (const species of speciesArray) {
    try {
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

      const imageUrl = await fetchSpeciesImage(species.name, species.scientificName);
      if (imageUrl) {
        results[species._id.toString()] = imageUrl;
      }
    } catch (error) {
      errors.push({
        id: species._id.toString(),
        name: species.name,
        error: error.message,
      });
    }
  }

  return { results, errors };
};

/**
 * Validate that an image URL is actually accessible
 * @param {string} imageUrl - URL to validate
 * @returns {Promise<boolean>} - True if image is accessible
 */
const validateImageUrl = async (imageUrl) => {
  if (!imageUrl) return false;

  try {
    const response = await axios.head(imageUrl, { timeout: 5000 });
    return response.status === 200 && response.headers['content-type']?.startsWith('image/');
  } catch {
    return false;
  }
};

/**
 * Get a high-quality fallback image for species
 * Uses Unsplash for nature/wildlife placeholder
 * @returns {string} - Fallback image URL
 */
const getFallbackImage = () => {
  const fallbackImages = [
    "https://images.unsplash.com/photo-1500829243541-74b67eeccc18?w=800&q=80",
    "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&q=80",
    "https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=800&q=80",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Walking_tiger_female_crop.jpg/1200px-Walking_tiger_female_crop.jpg",
  ];
  return fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
};

/**
 * Map species type to a themed fallback
 * @param {string} type - Species type (Mammal, Bird, Plant, etc.)
 * @returns {string} - Themed fallback image URL
 */
const getTypeBasedFallback = (type) => {
  const fallbacks = {
    Mammal: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Walking_tiger_female_crop.jpg/1200px-Walking_tiger_female_crop.jpg",
    Bird: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Peacock_India.jpg/1200px-Peacock_India.jpg",
    Reptile: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Python_molurus.jpg/800px-Python_molurus.jpg",
    Amphibian: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Eastern_iod_frog.jpg/800px-Eastern_iod_frog.jpg",
    Fish: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Indian_Major_Carp.jpg/800px-Indian_Major_Carp.jpg",
    Insect: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Common_Indian_Crow.jpg/800px-Common_Indian_Crow.jpg",
    Plant: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Quercus_semecarpifolia.jpg/800px-Quercus_semecarpifolia.jpg",
  };
  return fallbacks[type] || getFallbackImage();
};

module.exports = {
  fetchWikipediaImage,
  fetchWikimediaCommonsImage,
  fetchSpeciesImage,
  batchFetchImages,
  validateImageUrl,
  getFallbackImage,
  getTypeBasedFallback,
};