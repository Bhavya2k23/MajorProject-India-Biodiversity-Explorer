/**
 * Data Normalizer Service
 * Transforms GBIF/IUCN responses into standardized format
 */

/**
 * Conservation status mapping from IUCN codes to full names
 */
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

/**
 * Valid conservation status values
 */
const VALID_CONSERVATION_STATUSES = [
  "Extinct",
  "Extinct in Wild",
  "Critically Endangered",
  "Endangered",
  "Vulnerable",
  "Near Threatened",
  "Least Concern",
  "Data Deficient",
  "Not Evaluated",
  "Unknown",
];

/**
 * Normalize IUCN category code to full status name
 * @param {string|null} category - IUCN category code (EX, CR, EN, etc.)
 * @returns {string} Full conservation status name
 */
const normalizeConservationStatus = (category) => {
  if (!category) return "Unknown";
  const normalized = IUCN_STATUS_MAP[category.toUpperCase()];
  return normalized || "Unknown";
};

/**
 * Extract habitat information from IUCN data
 * @param {Object} iucnData - IUCN API response data
 * @returns {string[]} Array of habitat names (max 10)
 */
const extractHabitat = (iucnData) => {
  if (!iucnData) return [];

  const habitats = [];

  // From IUCN habitats array
  if (iucnData.habitats && Array.isArray(iucnData.habitats)) {
    iucnData.habitats.forEach((h) => {
      if (h.habitat && h.habitat.name) {
        habitats.push(h.habitat.name);
      } else if (h.habitat) {
        habitats.push(String(h.habitat));
      }
    });
  }

  // From GBIF habitat field
  if (iucnData.habitat && typeof iucnData.habitat === "string") {
    habitats.push(iucnData.habitat);
  }

  // Dedupe and limit
  return [...new Set(habitats)].slice(0, 10);
};

/**
 * Extract location data from GBIF occurrence records
 * @param {Object} gbifData - GBIF API response data
 * @returns {Array<{lat: number, lng: number, country?: string, locality?: string}>}
 */
const extractLocations = (gbifData) => {
  if (!gbifData) return [];

  const locations = [];

  // From occurrences array
  if (gbifData.occurrences && Array.isArray(gbifData.occurrences)) {
    gbifData.occurrences.forEach((occ) => {
      if (occ.decimalLatitude && occ.decimalLongitude) {
        locations.push({
          lat: parseFloat(occ.decimalLatitude),
          lng: parseFloat(occ.decimalLongitude),
          country: occ.country || undefined,
          locality: occ.locality || undefined,
        });
      }
    });
  }

  // Limit to 50 locations
  return locations.slice(0, 50);
};

/**
 * Normalize GBIF species match response
 * @param {Object} gbifMatch - GBIF species match API response
 * @returns {Object} Normalized species data
 */
const normalizeGbifSpecies = (gbifMatch) => {
  if (!gbifMatch) return null;

  return {
    key: gbifMatch.speciesKey || gbifMatch.key,
    scientificName: gbifMatch.scientificName,
    canonicalName: gbifMatch.canonicalName,
    rank: gbifMatch.rank,
    status: gbifMatch.status,
    matchType: gbifMatch.matchType,
    kingdom: gbifMatch.kingdom,
    phylum: gbifMatch.phylum,
    class: gbifMatch.class,
    order: gbifMatch.order,
    family: gbifMatch.family,
    genus: gbifMatch.genus,
  };
};

/**
 * Normalize GBIF occurrence record
 * @param {Object} occurrence - GBIF occurrence record
 * @returns {Object} Normalized occurrence data
 */
const normalizeGbifOccurrence = (occurrence) => {
  if (!occurrence) return null;

  return {
    key: occurrence.key,
    lat: occurrence.decimalLatitude ? parseFloat(occurrence.decimalLatitude) : null,
    lng: occurrence.decimalLongitude ? parseFloat(occurrence.decimalLongitude) : null,
    country: occurrence.country,
    countryCode: occurrence.countryCode,
    stateProvince: occurrence.stateProvince,
    locality: occurrence.locality,
    eventDate: occurrence.eventDate,
    basisOfRecord: occurrence.basisOfRecord,
    taxonomy: {
      kingdom: occurrence.kingdom,
      phylum: occurrence.phylum,
      class: occurrence.class,
      order: occurrence.order,
      family: occurrence.family,
      genus: occurrence.genus,
      scientificName: occurrence.scientificName,
      specificEpithet: occurrence.specificEpithet,
    },
    media: (occurrence.media || []).map((m) => ({
      type: m.type,
      url: m.url,
      title: m.title,
    })),
  };
};

/**
 * Normalize IUCN species data
 * @param {Object} iucnData - IUCN API response
 * @returns {Object} Normalized IUCN data
 */
const normalizeIucnData = (iucnData) => {
  if (!iucnData) return null;

  return {
    taxonid: iucnData.taxonid,
    scientificName: iucnData.scientific_name,
    commonNames: iucnData.common_names,
    category: iucnData.category,
    conservationStatus: normalizeConservationStatus(iucnData.category),
    assessmentYear: iucnData.assessment_year || iucnData.assessmentYear,
    criteria: iucnData.criteria,
    populationTrend: iucnData.population_trend || iucnData.populationTrend,
    habitat: extractHabitat(iucnData),
    threats: iucnData.threats || [],
    range: iucnData.range,
    countries: iucnData.countries || [],
  };
};

/**
 * Extract taxonomy from GBIF species match data
 * @param {Object} gbifData - GBIF species match response
 * @returns {Object} Taxonomy object with kingdom, family, genus
 */
const normalizeTaxonomy = (gbifData) => {
  if (!gbifData) return { kingdom: null, family: null, genus: null };
  return {
    kingdom: gbifData.kingdom || null,
    family: gbifData.family || null,
    genus: gbifData.genus || null,
  };
};

/**
 * Determine source based on available data
 * @param {Object} iucnData - IUCN data
 * @param {Object} gbifData - GBIF data
 * @returns {"IUCN" | "GBIF" | "combined"}
 */
const determineSource = (iucnData, gbifData) => {
  if (iucnData?.category) return "IUCN";
  if (gbifData?.key) return "GBIF";
  return "combined";
};

/**
 * Create normalized species summary from combined GBIF/IUCN data
 * @param {Object} iucnData - IUCN response data
 * @param {Object} gbifData - GBIF response data
 * @param {string} speciesName - Original species name searched
 * @returns {Object} Normalized species data in standard format
 */
const normalizeSpeciesData = (iucnData, gbifData, speciesName) => {
  const scientificName = iucnData?.scientific_name ||
    iucnData?.scientificName ||
    gbifData?.scientificName ||
    speciesName;

  return {
    name: speciesName,
    scientificName: scientificName,
    conservationStatus: normalizeConservationStatus(iucnData?.category || gbifData?.category),
    taxonomy: normalizeTaxonomy(gbifData),
    habitat: extractHabitat(iucnData || gbifData),
    locations: extractLocations(gbifData),
    source: determineSource(iucnData, gbifData),
    lastUpdated: new Date().toISOString(),
    iucnCategory: iucnData?.category || null,
    iucnAssessmentYear: iucnData?.assessment_year || iucnData?.assessmentYear || null,
    taxonid: iucnData?.taxonid || null,
    gbifKey: gbifData?.speciesKey || gbifData?.key || null,
    speciesCount: gbifData?.numDiagonalOccurrences || gbifData?.speciesCount || 0,
  };
};

/**
 * Validate normalized data has required fields
 * @param {Object} data - Normalized data to validate
 * @returns {boolean} True if valid
 */
const isValidNormalizedData = (data) => {
  return (
    data &&
    typeof data.name === "string" &&
    typeof data.scientificName === "string" &&
    VALID_CONSERVATION_STATUSES.includes(data.conservationStatus) &&
    Array.isArray(data.habitat) &&
    Array.isArray(data.locations) &&
    typeof data.lastUpdated === "string"
  );
};

module.exports = {
  normalizeConservationStatus,
  extractHabitat,
  extractLocations,
  normalizeGbifSpecies,
  normalizeGbifOccurrence,
  normalizeIucnData,
  normalizeSpeciesData,
  normalizeTaxonomy,
  determineSource,
  isValidNormalizedData,
  IUCN_STATUS_MAP,
  VALID_CONSERVATION_STATUSES,
};
