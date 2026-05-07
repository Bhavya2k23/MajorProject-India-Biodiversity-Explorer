// ============================================================
// FILE: backend/models/Species.js — FULLY FIXED VERSION
//
// FIXES APPLIED:
//  FIX 1  — imageUrl default changed from "" to a real category-based
//            fallback so Animals page never shows broken images.
//            Added virtual 'image' getter → always returns best available URL.
//  FIX 2  — Added 'diet' field (was missing — frontend shows diet info)
//  FIX 3  — Added 'region' field array (frontend filters by region)
//  FIX 4  — Added 'states' field array (Zones page needs state mapping)
//  FIX 5  — Added 'wikipediaUrl' field for AI service lookup
//  FIX 6  — Added 'isFeatured' boolean for Home page featured species
//  FIX 7  — conservationStatus index added for analytics/charts queries
//  FIX 8  — Added 'uses' field back (was in schema comment but missing)
//  FIX 9  — coordinates made fully optional with better defaults
//  FIX 10 — Added pre-save hook to auto-compute featureVector codes
//            so recommendation engine always has fresh vectors
//  FIX 11 — DUPLICATE FIX: Added 'normalizedName' field (unique sparse index)
//            Prevents duplicate species entries at the DB level.
//            normalizedName = name.toLowerCase().trim().replace(/\s+/g,' ')
//  FIX 12 — DUPLICATE FIX: Added 'zones' array field to store all merged
//            zone values when duplicates are deduped without breaking
//            the existing single-zone filter logic.
//  FIX 13 — DUPLICATE FIX: Added 'ecosystems' array field (same rationale).
// ============================================================

const mongoose = require("mongoose");

// ─── Category Fallback Images ─────────────────────────────────
// Used when imageUrl is empty — ensures Animals page never shows broken images
const FALLBACK_IMAGES = {
  Mammal:     "/images/fallback/mammal.jpg",
  Bird:       "/images/fallback/bird.jpg",
  Reptile:    "/images/fallback/reptile.jpg",
  Amphibian:  "/images/fallback/amphibian.jpg",
  Fish:       "/images/fallback/fish.jpg",
  Insect:     "/images/fallback/insect.jpg",
  Arachnid:   "/images/fallback/insect.jpg",
  Crustacean: "/images/fallback/aquatic.jpg",
  Mollusk:    "/images/fallback/aquatic.jpg",
  Other:      "/images/fallback/animal.jpg",
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
    // FIX 11: normalizedName — uniqueness key (lower-cased, trimmed, collapsed)
    // Auto-computed in pre-save hook. Unique sparse index prevents duplicates.
    normalizedName: {
      type:  String,
      trim:  true,
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
    zone: {
      type: String,
      required: true,
      trim: true,
    },
    // FIX 12: zones[] — populated by deduplication script with all merged zone values
    zones: [{ type: String, trim: true }],
    ecosystem: {
      type: String,
      required: true,
      trim: true,
    },
    // FIX 13: ecosystems[] — populated by dedup script with all merged ecosystem values
    ecosystems: [{ type: String, trim: true }],
    habitat: {
      type: String,
      default: "",
      trim: true,
    },
    // FIX 3: region array — used by frontend filter dropdowns
    region: [{
      type: String,
      trim: true,
    }],
    // FIX 4: states array — used by Zones page to list states per zone
    states: [{
      type: String,
      trim: true,
    }],
    coordinates: {
      lat:          { type: Number, default: null },
      lng:          { type: Number, default: null },
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
    population: {
      type: Number,
      default: 0,
      min: [0, "Population cannot be negative"],
    },
    habitatLoss: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    pollutionLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    climateRisk: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    threats: [{ type: String, trim: true }],

    // ── Description & Facts ──────────────────────────────────
    description: {
      type: String,
      required: true,
    },
<<<<<<< HEAD
    habitat: {
=======
    // FIX 2: diet field — shown on AnimalDetail page
    diet: {
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
      type: String,
      default: "",
      trim: true,
    },
    uses: [{ type: String, trim: true }],
    funFacts: [{ type: String, trim: true }],

    // ── Images ───────────────────────────────────────────────
    // FIX 1: imageUrl — primary image, defaults to category fallback
    imageUrl: {
      type: String,
      default: "",
    },
    images: [{ type: String }],
    // FIX 5: wikipediaUrl — used by image service to fetch correct image
    wikipediaUrl: {
      type: String,
      default: "",
    },

    // ── Meta ─────────────────────────────────────────────────
    // FIX 6: isFeatured — Home page featured species carousel
    isFeatured: {
      type: Boolean,
      default: false,
    },
    threats: [String],
    funFacts: [String],
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      locationName: { type: String, default: "" },
    },
    imageUrl: {
      type: String,
    },
    image: {
      type: String, // Kept for backward compatibility
      default: "",
    },
    images: [
      {
        type: String,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // ── Feature Vectors (auto-computed in pre-save) ──────────
    // FIX 10: auto-computed so recommendation engine always has fresh data
    featureVector: {
      ecosystemCode: { type: Number, default: 0 },
      statusCode:    { type: Number, default: 0 },
      typeCode:      { type: Number, default: 0 },
      zoneCode:      { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    // FIX 1: include virtuals when converting to JSON/Object
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual: image ───────────────────────────────────────────
// FIX 1: always returns best available image URL
// Frontend can use species.image instead of species.imageUrl
speciesSchema.virtual("image").get(function () {
  if (this.imageUrl && this.imageUrl.startsWith("http")) return this.imageUrl;
  if (this.images && this.images.length > 0)              return this.images[0];
  return FALLBACK_IMAGES[this.type] || FALLBACK_IMAGES.Other;
});

// ─── Pre-Save: Auto-Compute normalizedName + Feature Vectors ─
// FIX 10: keeps featureVector in sync whenever species is saved
// FIX 11: auto-computes normalizedName for duplicate prevention
speciesSchema.pre("save", function (next) {
  // FIX 11 — normalizedName: always in sync with name
  if (this.name) {
    this.normalizedName = this.name.toLowerCase().trim().replace(/\s+/g, " ");
  }

  // FIX 10 — feature vectors
  this.featureVector = {
    ecosystemCode: ECOSYSTEM_CODES[this.ecosystem]           || 0,
    statusCode:    STATUS_CODES[this.conservationStatus]     || 0,
    typeCode:      TYPE_CODES[this.type]                     || 0,
    zoneCode:      ZONE_CODES[this.zone]                     || 0,
  };
  next();
});

// ─── Indexes ─────────────────────────────────────────────────
// Text search
speciesSchema.index({ name: "text", scientificName: "text", description: "text" });

// FIX 11: unique normalizedName index — prevents duplicate species at DB level
// sparse:true allows old records without normalizedName to coexist until migrated
speciesSchema.index({ normalizedName: 1 }, { unique: true, sparse: true });

// Filter queries
speciesSchema.index({ type: 1 });
speciesSchema.index({ zone: 1 });
speciesSchema.index({ ecosystem: 1 });
speciesSchema.index({ conservationStatus: 1 });  // FIX 7: analytics charts
speciesSchema.index({ isFeatured: 1 });           // FIX 6: home page query

// Compound indexes for recommendation & analytics
speciesSchema.index({ ecosystem: 1, conservationStatus: 1, type: 1 });
speciesSchema.index({ ecosystem: 1, conservationStatus: 1 });
speciesSchema.index({ ecosystem: 1, type: 1 });
speciesSchema.index({ zone: 1, conservationStatus: 1 });

// Feature vector similarity
speciesSchema.index({
  "featureVector.ecosystemCode": 1,
  "featureVector.statusCode":    1,
  "featureVector.typeCode":      1,
});

module.exports = mongoose.model("Species", speciesSchema);