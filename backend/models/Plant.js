<<<<<<< HEAD
const mongoose = require("mongoose");

const plantSchema = new mongoose.Schema(
  {
=======
// ============================================================
// FILE: backend/models/Plant.js — FULLY FIXED VERSION
//
// FIXES APPLIED:
//  FIX 1  — Added virtual 'image' getter → always returns best
//            available URL, never shows broken image on Plants page
//  FIX 2  — Added 'uses' field (medicinal/other uses — was missing,
//            Plants page shows this info)
//  FIX 3  — Added 'floweringseason' field (shown on PlantDetail page)
//  FIX 4  — Added 'region' array for frontend filter dropdowns
//  FIX 5  — Added 'states' array for Zones page plant mapping
//  FIX 6  — Added 'wikipediaUrl' for image service lookup
//  FIX 7  — Added 'isFeatured' for Home page plants carousel
//  FIX 8  — population/habitatLoss/pollutionLevel/climateRisk
//            made optional with defaults (Plants page was crashing
//            because seed data didn't always include these)
//  FIX 9  — Added pre-save hook to auto-compute featureVector
//  FIX 10 — Added conservationStatus index for analytics charts
//  FIX 11 — DUPLICATE FIX: Added 'normalizedName' field (unique sparse index)
//            Prevents duplicate plant entries at the DB level.
//            normalizedName = name.toLowerCase().trim().replace(/\s+/g,' ')
//  FIX 12 — DUPLICATE FIX: Added 'zones' array field to store all merged
//            zone values during deduplication.
//  FIX 13 — DUPLICATE FIX: Added 'ecosystems' array field (same rationale).
// ============================================================

const mongoose = require("mongoose");

// ─── Category Fallback Images ─────────────────────────────────
const FALLBACK_IMAGES = {
  Tree:      "/images/fallback/tree.jpg",
  Shrub:     "/images/fallback/shrub.jpg",
  Herb:      "/images/fallback/herb.jpg",
  Medicinal: "/images/fallback/medicinal.jpg",
  Grass:     "/images/fallback/grass.jpg",
  Fern:      "/images/fallback/fern.jpg",
  Climber:   "/images/fallback/climber.jpg",
  Epiphyte:  "/images/fallback/epiphyte.jpg",
  Succulent: "/images/fallback/succulent.jpg",
  Aquatic:   "/images/fallback/aquatic.jpg",
  Other:     "/images/fallback/plant.jpg",
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
  Tree: 1, Shrub: 2, Herb: 3, Medicinal: 4, Grass: 5,
  Fern: 6, Climber: 7, Epiphyte: 8, Succulent: 9, Aquatic: 10, Other: 11,
};
const ZONE_CODES = {
  "Himalayan": 1, "Western Ghats": 2, "Eastern Ghats": 3,
  "Deccan Peninsula": 4, "Gangetic Plain": 5, "Thar Desert": 6,
  "North-East India": 7, "Coastal Regions": 8,
  "Andaman & Nicobar Islands": 9, "Lakshadweep": 10,
};

// ─── Schema ───────────────────────────────────────────────────
const plantSchema = new mongoose.Schema(
  {
    // ── Core Identity ─────────────────────────────────────────
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
    name: {
      type: String,
      required: [true, "Plant name is required"],
      trim: true,
    },
<<<<<<< HEAD
=======
    // FIX 11: normalizedName — uniqueness key (lower-cased, trimmed, collapsed)
    // Auto-computed in pre-save hook. Unique sparse index prevents duplicates.
    normalizedName: {
      type:  String,
      trim:  true,
      index: true,
    },
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
    scientificName: {
      type: String,
      required: [true, "Scientific name is required"],
      trim: true,
    },
    type: {
      type: String,
<<<<<<< HEAD
      enum: ["Tree", "Shrub", "Herb", "Medicinal", "Grass", "Fern", "Climber", "Other"],
      required: true,
    },
=======
      enum: ["Tree", "Shrub", "Herb", "Medicinal", "Grass", "Fern",
             "Climber", "Epiphyte", "Succulent", "Aquatic", "Other"],
      required: true,
    },

    // ── Habitat & Location ───────────────────────────────────
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
    zone: {
      type: String,
      required: true,
      trim: true,
    },
<<<<<<< HEAD
=======
    // FIX 12: zones[] — populated by dedup script with all merged zone values
    zones: [{ type: String, trim: true }],
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
    ecosystem: {
      type: String,
      required: true,
      trim: true,
    },
<<<<<<< HEAD
    conservationStatus: {
      type: String,
      enum: ["Safe", "Near Threatened", "Vulnerable", "Endangered", "Critically Endangered", "Extinct in Wild", "Extinct"],
      default: "Safe"
    },
=======
    // FIX 13: ecosystems[] — populated by dedup script with all merged ecosystem values
    ecosystems: [{ type: String, trim: true }],
    habitat: {
      type: String,
      default: "",
      trim: true,
    },
    // FIX 4: region array — frontend filter dropdowns
    region: [{
      type: String,
      trim: true,
    }],
    // FIX 5: states array — Zones page plant mapping
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
      default: "Least Concern",
    },
    // FIX 8: all numeric fields optional with defaults
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

    // ── Description & Uses ───────────────────────────────────
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
    description: {
      type: String,
      required: true,
    },
<<<<<<< HEAD
    habitat: {
      type: String,
      default: "",
    },
    uses: [String],
    funFacts: [String],
=======
    // FIX 2: uses field — medicinal/other uses shown on Plants page
    uses: [{ type: String, trim: true }],
    funFacts: [{ type: String, trim: true }],
    // FIX 3: floweringSeason — shown on PlantDetail page
    floweringSeason: {
      type: String,
      default: "",
      trim: true,
    },

    // ── Images ───────────────────────────────────────────────
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
    imageUrl: {
      type: String,
      default: "",
    },
<<<<<<< HEAD
    images: [
      {
        type: String,
      },
    ],
=======
    images: [{ type: String }],
    // FIX 6: wikipediaUrl — used by image service
    wikipediaUrl: {
      type: String,
      default: "",
    },

    // ── Meta ─────────────────────────────────────────────────
    // FIX 7: isFeatured — Home page plants carousel
    isFeatured: {
      type: Boolean,
      default: false,
    },
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
<<<<<<< HEAD
  },
  { timestamps: true }
);

// Text index for search
plantSchema.index({ name: "text", scientificName: "text", description: "text", uses: "text" });

module.exports = mongoose.model("Plant", plantSchema);
=======

    // ── Feature Vectors (auto-computed in pre-save) ──────────
    featureVector: {
      ecosystemCode: { type: Number, default: 0 },
      statusCode:    { type: Number, default: 0 },
      typeCode:      { type: Number, default: 0 },
      zoneCode:      { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual: image ───────────────────────────────────────────
// FIX 1: Plants page always gets a valid image URL
plantSchema.virtual("image").get(function () {
  if (this.imageUrl && this.imageUrl.startsWith("http")) return this.imageUrl;
  if (this.images && this.images.length > 0)              return this.images[0];
  return FALLBACK_IMAGES[this.type] || FALLBACK_IMAGES.Other;
});

// ─── Pre-Save: Auto-Compute normalizedName + Feature Vectors ─
// FIX 9:  keeps featureVector in sync
// FIX 11: auto-computes normalizedName for duplicate prevention
plantSchema.pre("save", function (next) {
  // FIX 11 — normalizedName: always in sync with name
  if (this.name) {
    this.normalizedName = this.name.toLowerCase().trim().replace(/\s+/g, " ");
  }

  // FIX 9 — feature vectors
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
plantSchema.index({ name: "text", scientificName: "text", description: "text", uses: "text" });

// FIX 11: unique normalizedName index — prevents duplicate plants at DB level
// sparse:true allows old records without normalizedName to coexist until migrated
plantSchema.index({ normalizedName: 1 }, { unique: true, sparse: true });

// Filter queries
plantSchema.index({ type: 1 });
plantSchema.index({ zone: 1 });
plantSchema.index({ ecosystem: 1 });
plantSchema.index({ conservationStatus: 1 });  // FIX 10: analytics charts
plantSchema.index({ isFeatured: 1 });           // FIX 7: home page query

// Compound indexes
plantSchema.index({ ecosystem: 1, conservationStatus: 1, type: 1 });
plantSchema.index({ ecosystem: 1, conservationStatus: 1 });
plantSchema.index({ ecosystem: 1, type: 1 });
plantSchema.index({ zone: 1, conservationStatus: 1 });

// Feature vector similarity
plantSchema.index({
  "featureVector.ecosystemCode": 1,
  "featureVector.statusCode":    1,
  "featureVector.typeCode":      1,
});

module.exports = mongoose.model("Plant", plantSchema);
>>>>>>> 3e43d5918dbd1f1ad9bcaa01cd46ec4c1502210d
