// ============================================================
// FILE: backend/models/Ecosystem.js — FULLY FIXED VERSION
//
// FIXES APPLIED:
//  FIX 1 — Added 'characteristics' array (Ecosystems page shows
//           "Characteristics:" section — was always EMPTY because
//           this field was missing from schema entirely)
//  FIX 2 — Added 'examplesInIndia' array (page shows
//           "Examples in India:" — was always empty)
//  FIX 3 — Added 'keyAnimals' array (page shows "Key Animals:" —
//           was always empty. Old field 'keySpecies' was there
//           but frontend expects 'keyAnimals')
//  FIX 4 — Added 'keyPlants' array (page shows "Key Plants:")
//  FIX 5 — Added 'services' array (Ecosystem Services section)
//  FIX 6 — Added 'threats' array (shown on ecosystem detail)
//  FIX 7 — Added 'climate' string (temperature/rainfall info)
//  FIX 8 — Added 'coveragePercent' number (% of India covered)
//  FIX 9 — Added 'image' with better fallback path
//  FIX 10 — Kept 'keySpecies' as alias for backward compatibility
// ============================================================

const mongoose = require("mongoose");

const ecosystemSchema = new mongoose.Schema(
  {
    // ── Core Identity ─────────────────────────────────────────
    name: {
      type: String,
      required: [true, "Ecosystem name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },

    // ── Page Display Fields ───────────────────────────────────
    // FIX 1: characteristics — Ecosystems page "Characteristics:" section
    characteristics: [{ type: String, trim: true }],

    // FIX 2: examplesInIndia — "Examples in India:" section
    examplesInIndia: [{ type: String, trim: true }],

    // FIX 3: keyAnimals — "Key Animals:" section (PRIMARY field)
    keyAnimals: [{ type: String, trim: true }],

    // FIX 4: keyPlants — "Key Plants:" section
    keyPlants: [{ type: String, trim: true }],

    // FIX 10: keySpecies kept for backward compatibility
    keySpecies: [{ type: String, trim: true }],

    // FIX 5: services — Ecosystem Services shown at bottom of page
    services: [{ type: String, trim: true }],

    // FIX 6: threats — shown on ecosystem detail
    threats: [{ type: String, trim: true }],

    // ── Location ──────────────────────────────────────────────
    zone: {
      type: String,
      required: true,
      trim: true,
    },

    // ── Environment Info ──────────────────────────────────────
    // FIX 7: climate — temperature/rainfall info
    climate: {
      type: String,
      default: "",
      trim: true,
    },
    // FIX 8: coveragePercent — % of India this ecosystem covers
    coveragePercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    area: {
      type: Number,
      default: 0,
      comment: "Area in sq km",
    },
    majorThreats: [{ type: String, trim: true }],

    // ── Image ─────────────────────────────────────────────────
    // FIX 9: better default fallback
    image: {
      type: String,
      default: "/images/fallback/ecosystem.jpg",
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual: speciesCount ────────────────────────────────────
// Shown as "X species in India" on ecosystem card
ecosystemSchema.virtual("speciesCount").get(function () {
  return (this.keyAnimals?.length || 0) + (this.keyPlants?.length || 0);
});

// ─── Indexes ─────────────────────────────────────────────────
ecosystemSchema.index({ name: "text", description: "text" });
ecosystemSchema.index({ name: 1 });
ecosystemSchema.index({ zone: 1 });

module.exports = mongoose.model("Ecosystem", ecosystemSchema);