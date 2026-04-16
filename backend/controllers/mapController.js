const Species = require("../models/Species");
const Plant = require("../models/Plant");

// Zone center coordinates for fallback (used when species has no GPS coordinates)
// These are actual geographic centers of each biogeographic zone in India
const ZONE_COORDINATES = {
  "Trans-Himalayan":   { lat: 34.1, lng: 77.5 },
  "Himalayan":          { lat: 27.5, lng: 88.5 },
  "Desert":              { lat: 26.9, lng: 70.9 },
  "Semi-Arid":           { lat: 23.0, lng: 72.0 },
  "Western Ghats":       { lat: 10.0, lng: 77.0 },
  "Deccan Plateau":      { lat: 17.0, lng: 78.0 },
  "Gangetic Plain":      { lat: 25.0, lng: 82.0 },
  "Indo-Gangetic Plain": { lat: 26.0, lng: 81.0 },
  "Central India":       { lat: 23.0, lng: 80.0 },
  "Eastern Ghats":       { lat: 16.0, lng: 80.5 },
  "North-East India":    { lat: 26.0, lng: 92.0 },
  "Coasts":              { lat: 15.0, lng: 73.0 },
  "Coastal":             { lat: 12.0, lng: 75.0 },
  "Islands":             { lat: 11.0, lng: 92.0 },
  "Deccan Peninsula":    { lat: 16.0, lng: 76.0 },
  "Thar Desert":         { lat: 26.9, lng: 70.9 },
};

// Known zone aliases for matching
const ZONE_ALIASES = {
  "Western Ghats": ["Western Ghats", "Western ghats", "western ghats"],
  "Himalayan": ["Himalayan", "Himalayas", "Himalaya", "Himalayan region"],
  "Trans-Himalayan": ["Trans-Himalayan", "Trans Himalayan", "Transhimalayan"],
  "Desert": ["Desert", "Thar Desert", "Thar desert"],
  "Semi-Arid": ["Semi-Arid", "Semi Arid", "Sahara"],
  "Deccan Plateau": ["Deccan Plateau", "Deccan", "Deccan peninsula"],
  "Gangetic Plain": ["Gangetic Plain", "Gangetic plain", "Ganga plain"],
  "Indo-Gangetic Plain": ["Indo-Gangetic Plain", "Indo Gangetic", "Indo-gangetic"],
  "Central India": ["Central India", "Central Indian"],
  "Eastern Ghats": ["Eastern Ghats", "Eastern ghats"],
  "North-East India": ["North-East India", "Northeast India", "North East India", "NE India"],
  "Coasts": ["Coasts", "Coast", "Coastal", "Coasting"],
  "Islands": ["Islands", "Island", "Andaman", "Nicobar"],
};

// Get canonical zone name
const getCanonicalZone = (zoneName) => {
  if (!zoneName) return null;
  const upper = zoneName.trim();
  for (const [canonical, aliases] of Object.entries(ZONE_ALIASES)) {
    if (aliases.some(a => a.toLowerCase() === upper.toLowerCase()) || canonical.toLowerCase() === upper.toLowerCase()) {
      return canonical;
    }
  }
  return zoneName; // Return as-is if no match
};

// Get zone center coordinates
const getZoneCoordinates = (zone) => {
  const canonical = getCanonicalZone(zone);
  return ZONE_COORDINATES[canonical] || ZONE_COORDINATES["Western Ghats"];
};

// @desc    Get all species with location data for map display
// @route   GET /api/map/species
// @access  Public
// @query   filter=animals|plants|all (default: all)
//          zone=string (optional filter)
//          ecosystem=string (optional filter)
//          status=string (optional filter)
exports.getMapSpecies = async (req, res, next) => {
  try {
    const { filter = "all", zone, ecosystem, status } = req.query;

    const animalsFilter = { isDeleted: { $ne: true } };
    const plantsFilter = {};

    if (zone) {
      const regex = new RegExp(zone, "i");
      animalsFilter.zone = regex;
      plantsFilter.zone = regex;
    }
    if (ecosystem) {
      const regex = new RegExp(ecosystem, "i");
      animalsFilter.ecosystem = regex;
      plantsFilter.ecosystem = regex;
    }
    if (status) {
      animalsFilter.conservationStatus = status;
      plantsFilter.conservationStatus = status;
    }

    let animalData = [];
    let plantData = [];

    // Fetch animals
    if (filter === "all" || filter === "animals") {
      const animals = await Species.find(animalsFilter)
        .select("name scientificName type conservationStatus zone ecosystem imageUrl coordinates")
        .lean();

      animalData = animals.map((s) => {
        // Use real coordinates if available, otherwise use zone center
        let lat = s.coordinates?.lat ?? null;
        let lng = s.coordinates?.lng ?? null;
        let locationName = s.coordinates?.locationName || "";

        // Fallback to zone center (deterministic, not random)
        if (lat === null || lng === null) {
          const zc = getZoneCoordinates(s.zone);
          // Add small deterministic offset based on species name hash to avoid stacking
          const hash = (s.name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
          const offset = (hash % 100) / 1000; // 0-0.1 degree offset
          lat = zc.lat + offset;
          lng = zc.lng + offset;
          locationName = s.zone || ""; // Label with zone name instead of random
        }

        return {
          id: s._id.toString(),
          name: s.name,
          scientificName: s.scientificName,
          type: s.type,
          conservationStatus: s.conservationStatus,
          zone: s.zone,
          ecosystem: s.ecosystem,
          imageUrl: s.imageUrl || "",
          category: "animal",
          lat,
          lng,
          locationName,
        };
      });
    }

    // Fetch plants
    if (filter === "all" || filter === "plants") {
      const plants = await Plant.find(plantsFilter)
        .select("name scientificName type conservationStatus zone ecosystem imageUrl coordinates")
        .lean();

      plantData = plants.map((p) => {
        let lat = p.coordinates?.lat ?? null;
        let lng = p.coordinates?.lng ?? null;
        let locationName = p.coordinates?.locationName || "";

        if (lat === null || lng === null) {
          const zc = getZoneCoordinates(p.zone);
          const hash = (p.name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
          const offset = (hash % 100) / 1000;
          lat = zc.lat + offset;
          lng = zc.lng + offset;
          locationName = p.zone || "";
        }

        return {
          id: p._id.toString(),
          name: p.name,
          scientificName: p.scientificName,
          type: p.type,
          conservationStatus: p.conservationStatus,
          zone: p.zone,
          ecosystem: p.ecosystem,
          imageUrl: p.imageUrl || "",
          category: "plant",
          lat,
          lng,
          locationName,
        };
      });
    }

    const allData = [...animalData, ...plantData];

    res.status(200).json({
      success: true,
      total: allData.length,
      animalsCount: animalData.length,
      plantsCount: plantData.length,
      data: allData,
    });
  } catch (error) {
    next(error);
  }
};