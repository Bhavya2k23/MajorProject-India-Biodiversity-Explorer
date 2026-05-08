// ============================================================
// FILE: backend/models/Species.js — FINAL STABLE VERSION
// ============================================================

const mongoose = require("mongoose");

// ─── Category Fallback Images ─────────────────────────────────
// Used when imageUrl is empty — ensures frontend never shows broken images
const FALLBACK_IMAGES = {
  Mammal: "/images/fallback/mammal.jpg",
  Bird: "/images/fallback/bird.jpg",
  Reptile: "/images/fallback/reptile.jpg",
  Amphibian: "/images/fallback/amphibian.jpg",
  Fish: "/images/fallback/fish.jpg",
  Insect: "/images/fallback/insect.jpg",
  Arachnid: "/images/fallback/insect.jpg",
  Crustacean: "/images/fallback/aquatic.jpg",
  Mollusk: "/images/fallback/aquatic.jpg",
  Other: "/images/fallback/animal.jpg",
};

// ─── Enum Maps for Feature Vectors ───────────────────────────
const ECOSYSTEM_CODES = {
  "Tropical Forest": 1, "Subtropical Forest": 2, "Temperate Forest": 3,
  "Mangrove Forest": 4, "Grassland": 5, "Desert": 6, "Wetland": 7,
  "Coastal": 8, "Coral Reef": 9, "Alpine Meadow": 10,
};
const STATUS_CODES = {
  "Least Concern": 0, "Near Threatened": 1, "Vulnerable": 2,
  "Endangered": 3, "Critically Endangered": 4, "Extinct in Wild": 5, "Extinct": 6,
};
const TYPE_CODES = {
  Mammal: 1, Bird: 2, Reptile: 3, Amphibian: 4,
  Fish: 5, Insect: 6, Arachnid: 7, Crustacean: 8, Mollusk: 9, Other: 10,
};
const ZONE_CODES = {
  "Himalayan": 1, "Western Ghats": 2, "Eastern Ghats": 3,
  "Deccan Peninsula": 4, "Gangetic Plain": 5, "Thar Desert": 6,
  "North-East India": 7, "Coastal Regions": 8,
  "Andaman & Nicobar Islands": 9, "Lakshadweep": 10,
};

// ─── Schema ───────────────────────────────────────────────────
const speciesSchema = new mongoose.Schema(
  {
    // ── Core Identity ─────────────────────────────────────────
    name: {
      type: String,
      required: [true, "Species name is required"],
      trim: true,
    },
    // Unique key to prevent duplicates (computed in pre-save)
    normalizedName: {
      type: String,
      trim: true,
      index: true,
    },
    scientificName: {
      type: String,
      required: [true, "Scientific name is required"],
      trim: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["Mammal", "Bird", "Reptile", "Amphibian", "Fish", "Insect",
        "Arachnid", "Crustacean", "Mollusk", "Other"],
      required: true,
    },

    // ── Habitat & Location ───────────────────────────────────
    zone: { type: String, required: true, trim: true },
    zones: [{ type: String, trim: true }], // For merged duplicate records
    ecosystem: { type: String, required: true, trim: true },
    ecosystems: [{ type: String, trim: true }], // For merged duplicate records
    habitat: { type: String, default: "", trim: true },
    region: [{ type: String, trim: true }],
    states: [{ type: String, trim: true }],
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      locationName: { type: String, default: "" },
    },

    // ── Conservation ─────────────────────────────────────────
    conservationStatus: {
      type: String,
      enum: ["Least Concern", "Near Threatened", "Vulnerable",
        "Endangered", "Critically Endangered", "Extinct in Wild", "Extinct"],
      required: true,
      default: "Least Concern",
    },
    population: { type: Number, default: 0, min: 0 },
    habitatLoss: { type: Number, default: 0, min: 0, max: 100 },
    pollutionLevel: { type: Number, default: 0, min: 0, max: 100 },
    climateRisk: { type: Number, default: 0, min: 0, max: 100 },
    threats: [{ type: String, trim: true }],

    // ── Description & Facts ──────────────────────────────────
    description: { type: String, required: true },
    diet: { type: String, default: "", trim: true },
    uses: [{ type: String, trim: true }],
    funFacts: [{ type: String, trim: true }],

    // ── Images ───────────────────────────────────────────────
    imageUrl: { type: String, default: "" },
    images: [{ type: String }],
    wikipediaUrl: { type: String, default: "" },

    // ── Meta ─────────────────────────────────────────────────
    isFeatured: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // ── Feature Vectors (auto-computed in pre-save) ──────────
    featureVector: {
      ecosystemCode: { type: Number, default: 0 },
      statusCode: { type: Number, default: 0 },
      typeCode: { type: Number, default: 0 },
      zoneCode: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual: image ───────────────────────────────────────────
// This returns the best image URL. Usage in frontend: species.image
// Resolves the crash: No physical "image" field exists in the schema above.
speciesSchema.virtual("image").get(function () {
  if (this.imageUrl && this.imageUrl.startsWith("http")) return this.imageUrl;
  if (this.images && this.images.length > 0) return this.images[0];
  return FALLBACK_IMAGES[this.type] || FALLBACK_IMAGES.Other;
});

// ─── Pre-Save Hook ───────────────────────────────────────────
speciesSchema.pre("save", function (next) {
  // Compute normalized name for duplicate prevention
  if (this.name) {
    this.normalizedName = this.name.toLowerCase().trim().replace(/\s+/g, " ");
  }

  // Compute feature vectors for recommendation engine
  this.featureVector = {
    ecosystemCode: ECOSYSTEM_CODES[this.ecosystem] || 0,
    statusCode: STATUS_CODES[this.conservationStatus] || 0,
    typeCode: TYPE_CODES[this.type] || 0,
    zoneCode: ZONE_CODES[this.zone] || 0,
  };
  next();
});

// ─── Indexes ─────────────────────────────────────────────────
speciesSchema.index({ name: "text", scientificName: "text", description: "text" });
speciesSchema.index({ normalizedName: 1 }, { unique: true, sparse: true });
speciesSchema.index({ type: 1 });
speciesSchema.index({ zone: 1 });
speciesSchema.index({ ecosystem: 1 });
speciesSchema.index({ conservationStatus: 1 });
speciesSchema.index({ isFeatured: 1 });

// Compound indexes for recommendation similarity
speciesSchema.index({
  "featureVector.ecosystemCode": 1,
  "featureVector.statusCode": 1,
  "featureVector.typeCode": 1,
});

module.exports = mongoose.model("Species", speciesSchema);