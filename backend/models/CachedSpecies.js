const mongoose = require("mongoose");

const cachedSpeciesSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  data: {
    name: String,
    scientificName: String,
    conservationStatus: String,
    taxonomy: {
      kingdom: String,
      family: String,
      genus: String,
    },
    habitat: [String],
    locations: [
      {
        lat: Number,
        lng: Number,
        region: String,
      },
    ],
    source: String,  // "IUCN" | "GBIF" | "combined"
    lastUpdated: String,
    iucnCategory: String,
    iucnAssessmentYear: Number,
    taxonid: String,
    gbifKey: Number,
    speciesCount: Number,
  },
}, { timestamps: true });

// TTL index - auto-delete after 24 hours
cachedSpeciesSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

module.exports = mongoose.model("CachedSpecies", cachedSpeciesSchema);