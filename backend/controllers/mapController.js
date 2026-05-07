const Species = require("../models/Species");
const Plant   = require("../models/Plant");
const { getSpeciesIcon } = require("../utils/getSpeciesIcon");

// Zone center coordinates — actual geographic centers of each biogeographic zone in India
const ZONE_COORDINATES = {
  "Trans-Himalayan":    { lat: 34.1, lng: 77.5 },
  "Himalayan":          { lat: 27.5, lng: 88.5 },
  "Desert":             { lat: 26.9, lng: 70.9 },
  "Semi-Arid":          { lat: 23.0, lng: 72.0 },
  "Western Ghats":      { lat: 10.0, lng: 77.0 },
  "Deccan Plateau":     { lat: 17.0, lng: 78.0 },
  "Gangetic Plain":     { lat: 25.0, lng: 82.0 },
  "Indo-Gangetic Plain":{ lat: 26.0, lng: 81.0 },
  "Central India":      { lat: 23.0, lng: 80.0 },
  "Eastern Ghats":      { lat: 16.0, lng: 80.5 },
  "North-East India":   { lat: 26.0, lng: 92.0 },
  "Coasts":             { lat: 15.0, lng: 73.0 },
  "Coastal":            { lat: 12.0, lng: 75.0 },
  "Islands":            { lat: 11.0, lng: 92.0 },
  "Deccan Peninsula":   { lat: 16.0, lng: 76.0 },
  "Thar Desert":        { lat: 26.9, lng: 70.9 },
};

const ZONE_ALIASES = {
  "Western Ghats":       ["Western Ghats", "Western ghats", "western ghats"],
  "Himalayan":           ["Himalayan", "Himalayas", "Himalaya", "Himalayan region"],
  "Trans-Himalayan":     ["Trans-Himalayan", "Trans Himalayan", "Transhimalayan"],
  "Desert":              ["Desert", "Thar Desert", "Thar desert"],
  "Semi-Arid":           ["Semi-Arid", "Semi Arid", "Sahara"],
  "Deccan Plateau":      ["Deccan Plateau", "Deccan", "Deccan peninsula"],
  "Gangetic Plain":      ["Gangetic Plain", "Gangetic plain", "Ganga plain"],
  "Indo-Gangetic Plain": ["Indo-Gangetic Plain", "Indo Gangetic", "Indo-gangetic"],
  "Central India":       ["Central India", "Central Indian"],
  "Eastern Ghats":       ["Eastern Ghats", "Eastern ghats"],
  "North-East India":    ["North-East India", "Northeast India", "North East India", "NE India"],
  "Coasts":              ["Coasts", "Coast", "Coastal", "Coasting"],
  "Islands":             ["Islands", "Island", "Andaman", "Nicobar"],
};

const getCanonicalZone = (zoneName) => {
  if (!zoneName) return null;
  const upper = zoneName.trim();
  for (const [canonical, aliases] of Object.entries(ZONE_ALIASES)) {
    if (
      aliases.some(a => a.toLowerCase() === upper.toLowerCase()) ||
      canonical.toLowerCase() === upper.toLowerCase()
    ) return canonical;
  }
  return zoneName;
};

const getZoneCoordinates = (zone) => {
  const canonical = getCanonicalZone(zone);
  return ZONE_COORDINATES[canonical] || ZONE_COORDINATES["Western Ghats"];
};

// Deterministic offset so nearby species don't stack exactly
const deterministicOffset = (name = "") => {
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return (hash % 100) / 1000; // 0–0.1 degree offset
};

// @desc    Get all species with location data for map display
// @route   GET /api/map/species
// @access  Public
exports.getMapSpecies = async (req, res, next) => {
  try {
    const { filter = "all", zone, ecosystem, status } = req.query;

    const animalsFilter = { isDeleted: { $ne: true } };
    const plantsFilter  = {};

    if (zone) {
      const regex = new RegExp(zone, "i");
      animalsFilter.zone = regex;
      plantsFilter.zone  = regex;
    }
    if (ecosystem) {
      const regex = new RegExp(ecosystem, "i");
      animalsFilter.ecosystem = regex;
      plantsFilter.ecosystem  = regex;
    }
    if (status) {
      animalsFilter.conservationStatus = status;
      plantsFilter.conservationStatus  = status;
    }

    let animalData  = [];
    let plantData   = [];
    let animalError = null;
    let plantError  = null;

    // ── Fetch animals ──────────────────────────────────────────────
    if (filter === "all" || filter === "animals") {
      try {
        const animals = await Species.find(animalsFilter)
          .select("name scientificName type conservationStatus zone ecosystem coordinates")
          .lean();

        animalData = animals.map((s) => {
          let lat = s.coordinates?.lat ?? null;
          let lng = s.coordinates?.lng ?? null;
          let locationName = s.coordinates?.locationName || "";

          if (lat === null || lng === null) {
            const zc     = getZoneCoordinates(s.zone);
            const offset = deterministicOffset(s.name);
            lat = zc.lat + offset;
            lng = zc.lng + offset;
            locationName = s.zone || "";
          }

          return {
            id:                 s._id.toString(),
            name:               s.name,
            scientificName:     s.scientificName,
            type:               s.type,
            conservationStatus: s.conservationStatus,
            zone:               s.zone,
            ecosystem:          s.ecosystem,
            icon:               getSpeciesIcon(s.name, s.type, s.scientificName),
            category:           "animal",
            lat,
            lng,
            locationName,
          };
        });
      } catch (err) {
        animalError = err.message;
      }
    }

    // ── Fetch plants ───────────────────────────────────────────────
    if (filter === "all" || filter === "plants") {
      try {
        const plants = await Plant.find(plantsFilter)
          .select("name scientificName type conservationStatus zone ecosystem coordinates")
          .lean();

        plantData = plants.map((p) => {
          let lat = p.coordinates?.lat ?? null;
          let lng = p.coordinates?.lng ?? null;
          let locationName = p.coordinates?.locationName || "";

          if (lat === null || lng === null) {
            const zc     = getZoneCoordinates(p.zone);
            const offset = deterministicOffset(p.name);
            lat = zc.lat + offset;
            lng = zc.lng + offset;
            locationName = p.zone || "";
          }

          return {
            id:                 p._id.toString(),
            name:               p.name,
            scientificName:     p.scientificName,
            type:               p.type,
            conservationStatus: p.conservationStatus,
            zone:               p.zone,
            ecosystem:          p.ecosystem,
            icon:               getSpeciesIcon(p.name, p.type || "Plant", p.scientificName),
            category:           "plant",
            lat,
            lng,
            locationName,
          };
        });
      } catch (err) {
        plantError = err.message;
      }
    }

    const allData       = [...animalData, ...plantData];
    const partialFailure = !!(animalError || plantError);

    res.status(200).json({
      success:       !partialFailure,
      partialFailure,
      total:         allData.length,
      animalsCount:  animalData.length,
      plantsCount:   plantData.length,
      data:          allData,
      warnings: [
        animalError ? `Animals: ${animalError}` : null,
        plantError  ? `Plants: ${plantError}`   : null,
      ].filter(Boolean),
    });
  } catch (error) {
    next(error);
  }
};