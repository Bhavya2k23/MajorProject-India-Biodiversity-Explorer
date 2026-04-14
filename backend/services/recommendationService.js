/**
 * ============================================
 * RECOMMENDATION SERVICE
 * ============================================
 * Scalable recommendation engine for biodiversity app
 * Uses rule-based scoring with optional cosine similarity
 *
 * Scoring Rules:
 * - Ecosystem match: +3 points (highest priority)
 * - Conservation status match: +2 points
 * - Taxonomy (type) match: +1 point
 *
 * Optional Advanced: Cosine similarity using feature vectors
 * ============================================
 */

const Species = require("../models/Species");

// ============================================
// ENCODING MAPS FOR FEATURE VECTORS
// ============================================

// Conservation status severity encoding (0 = safest, 6 = extinct)
const STATUS_CODES = {
  "Safe": 0,
  "Near Threatened": 1,
  "Vulnerable": 2,
  "Endangered": 3,
  "Critically Endangered": 4,
  "Extinct in Wild": 5,
  "Extinct": 6,
};

// Taxonomy type encoding
const TYPE_CODES = {
  "Mammal": 0,
  "Bird": 1,
  "Reptile": 2,
  "Amphibian": 3,
  "Fish": 4,
  "Insect": 5,
  "Plant": 6,
  "Other": 7,
};

// Ecosystem encoding (can be extended based on actual ecosystems)
const ECOSYSTEM_CODES = {
  "Tropical Rainforest": 0,
  "Deciduous Forest": 1,
  "Coniferous Forest": 2,
  "Grassland": 3,
  "Desert": 4,
  "Wetland": 5,
  "Marine": 6,
  "Freshwater": 7,
  "Mountain": 8,
  "Coastal": 9,
  "Cave": 10,
};

// ============================================
// SCORING FUNCTIONS
// ============================================

/**
 * Calculate rule-based similarity score between two species
 * @param {Object} source - Source species
 * @param {Object} candidate - Candidate species for recommendation
 * @returns {number} Total similarity score
 */
function calculateRuleBasedScore(source, candidate) {
  let score = 0;

  // Ecosystem match = +3 (highest priority)
  if (source.ecosystem === candidate.ecosystem) {
    score += 3;
  }

  // Conservation status match = +2
  if (source.conservationStatus === candidate.conservationStatus) {
    score += 2;
  }

  // Taxonomy (type) match = +1
  if (source.type === candidate.type) {
    score += 1;
  }

  return score;
}

/**
 * Calculate cosine similarity between two feature vectors
 * Used for optional advanced recommendations
 * @param {Object} vec1 - First feature vector
 * @param {Object} vec2 - Second feature vector
 * @returns {number} Cosine similarity (-1 to 1)
 */
function calculateCosineSimilarity(vec1, vec2) {
  // Ensure feature vectors exist
  if (!vec1 || !vec2) return 0;

  const v1 = [vec1.ecosystemCode || 0, vec1.statusCode || 0, vec1.typeCode || 0, vec1.zoneCode || 0];
  const v2 = [vec2.ecosystemCode || 0, vec2.statusCode || 0, vec2.typeCode || 0, vec2.zoneCode || 0];

  // Calculate dot product
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    magnitude1 += v1[i] * v1[i];
    magnitude2 += v2[i] * v2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  // Avoid division by zero
  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Encode a species into a feature vector for similarity calculations
 * @param {Object} species - Species document
 * @returns {Object} Feature vector
 */
function encodeSpeciesToFeatureVector(species) {
  return {
    ecosystemCode: ECOSYSTEM_CODES[species.ecosystem] || Math.abs(hashString(species.ecosystem) % 11),
    statusCode: STATUS_CODES[species.conservationStatus] || 0,
    typeCode: TYPE_CODES[species.type] || 7,
    zoneCode: Math.abs(hashString(species.zone) % 7),
  };
}

// Simple hash function for strings
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

// ============================================
// MAIN RECOMMENDATION FUNCTIONS
// ============================================

/**
 * Get recommendations for a species using rule-based scoring
 * @param {string} speciesId - MongoDB ObjectId of the source species
 * @param {number} limit - Maximum number of recommendations (default: 5)
 * @returns {Array} Sorted array of recommended species with scores
 */
async function getRuleBasedRecommendations(speciesId, limit = 5) {
  // Fetch source species
  const sourceSpecies = await Species.findById(speciesId);
  if (!sourceSpecies) {
    throw new Error("Species not found");
  }

  // Fetch all potential candidates (excluding source species)
  const candidates = await Species.find({
    _id: { $ne: speciesId },
    $or: [
      { ecosystem: sourceSpecies.ecosystem },
      { zone: sourceSpecies.zone },
      { conservationStatus: sourceSpecies.conservationStatus },
      { type: sourceSpecies.type },
    ],
  }).select("name scientificName type conservationStatus image imageUrl zone ecosystem population");

  // Score and sort candidates
  const scoredCandidates = candidates.map(candidate => ({
    species: candidate,
    score: calculateRuleBasedScore(sourceSpecies, candidate),
  }));

  // Sort by score descending, then by population descending for tie-breaking
  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.species.population - a.species.population;
  });

  // Return top N recommendations
  return scoredCandidates.slice(0, limit).map(item => ({
    _id: item.species._id,
    name: item.species.name,
    scientificName: item.species.scientificName,
    type: item.species.type,
    conservationStatus: item.species.conservationStatus,
    image: item.species.imageUrl || item.species.image,
    ecosystem: item.species.ecosystem,
    zone: item.species.zone,
    score: item.score,
  }));
}

/**
 * Get recommendations using cosine similarity (optional advanced feature)
 * @param {string} speciesId - MongoDB ObjectId of the source species
 * @param {number} limit - Maximum number of recommendations
 * @returns {Array} Sorted array of recommended species with similarity scores
 */
async function getCosineSimilarityRecommendations(speciesId, limit = 5) {
  const sourceSpecies = await Species.findById(speciesId);
  if (!sourceSpecies) {
    throw new Error("Species not found");
  }

  // Get or generate feature vector
  let sourceVector = sourceSpecies.featureVector;
  if (!sourceVector || Object.keys(sourceVector).length === 0) {
    sourceVector = encodeSpeciesToFeatureVector(sourceSpecies);
  }

  // Fetch candidates
  const candidates = await Species.find({
    _id: { $ne: speciesId },
  }).select("name scientificName type conservationStatus image imageUrl ecosystem zone population featureVector");

  // Calculate similarity scores
  const similarityScores = candidates.map(candidate => {
    let candidateVector = candidate.featureVector;
    if (!candidateVector || Object.keys(candidateVector).length === 0) {
      candidateVector = encodeSpeciesToFeatureVector(candidate);
    }

    const similarity = calculateCosineSimilarity(sourceVector, candidateVector);

    return {
      species: candidate,
      score: similarity,
    };
  });

  // Sort by similarity descending
  similarityScores.sort((a, b) => b.score - a.score);

  return similarityScores.slice(0, limit).map(item => ({
    _id: item.species._id,
    name: item.species.name,
    scientificName: item.species.scientificName,
    type: item.species.type,
    conservationStatus: item.species.conservationStatus,
    image: item.species.imageUrl || item.species.image,
    ecosystem: item.species.ecosystem,
    zone: item.species.zone,
    score: Math.round(item.score * 100) / 100, // Round to 2 decimal places
  }));
}

/**
 * Combined recommendation function (rule-based + optional cosine)
 * @param {string} speciesId - MongoDB ObjectId of the source species
 * @param {Object} options - Configuration options
 * @returns {Object} Recommendations with metadata
 */
async function getRecommendations(speciesId, options = {}) {
  const { limit = 5, useCosine = false } = options;

  // Validate speciesId
  if (!speciesId) {
    throw new Error("Species ID is required");
  }

  // Validate ObjectId format
  if (!/^[0-9a-fA-F]{24}$/.test(speciesId)) {
    throw new Error("Invalid species ID format");
  }

  const startTime = Date.now();

  let recommendations;
  if (useCosine) {
    recommendations = await getCosineSimilarityRecommendations(speciesId, limit);
  } else {
    recommendations = await getRuleBasedRecommendations(speciesId, limit);
  }

  const responseTime = Date.now() - startTime;

  return {
    sourceSpeciesId: speciesId,
    recommendations,
    metadata: {
      count: recommendations.length,
      responseTimeMs: responseTime,
      algorithm: useCosine ? "cosine-similarity" : "rule-based",
      limit,
    },
  };
}

/**
 * Batch recommendations for multiple species (for caching/preloading)
 * @param {Array<string>} speciesIds - Array of species IDs
 * @param {number} limit - Recommendations per species
 * @returns {Object} Map of speciesId -> recommendations
 */
async function getBatchRecommendations(speciesIds, limit = 5) {
  const results = {};

  for (const speciesId of speciesIds) {
    try {
      const result = await getRecommendations(speciesId, { limit });
      results[speciesId] = result.recommendations;
    } catch (error) {
      results[speciesId] = [];
    }
  }

  return results;
}

module.exports = {
  getRecommendations,
  getRuleBasedRecommendations,
  getCosineSimilarityRecommendations,
  getBatchRecommendations,
  calculateRuleBasedScore,
  calculateCosineSimilarity,
  encodeSpeciesToFeatureVector,
  STATUS_CODES,
  TYPE_CODES,
  ECOSYSTEM_CODES,
};