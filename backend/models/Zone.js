// ============================================================
// FILE: backend/models/Zone.js — FULLY FIXED VERSION
//
// FIXES APPLIED:
//  FIX 1 — Added 'keyAnimals' field array (was 'keySpecies' but
//           frontend Zones page uses keyAnimals — this caused
//           ALL zones to show empty Key Animals section)
//  FIX 2 — Added 'keyPlants' field array (Zones page shows plants)
//  FIX 3 — Added 'coverage' string field (Zones page shows "Coverage:")
//  FIX 4 — Added 'climate' string field (shown on zone detail)
//  FIX 5 — Added 'biodiversityIndex' number (used by analytics)
//  FIX 6 — Added 'coordinates' for map center of each zone
//  FIX 7 — Added 'nationalParks' array (shown on zone page)
//  FIX 8 — Added 'wildlifeSanctuaries' array
//  FIX 9 — Kept 'keySpecies' as alias (backward compat) but
//           primary field is now 'keyAnimals'
//  FIX 10 — Added 'totalSpeciesCount' virtual for zone stats
// ============================================================

const mongoose = require("mongoose");

const zoneSchema = new mongoose.Schema(
  {
    // ── Core Identity ─────────────────────────────────────────
    zoneName: {
      type: String,
      required: [true, "Zone name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },

    // ── Location Data ─────────────────────────────────────────
    statesCovered: [{ type: String, trim: true }],
    // FIX 3: coverage — shown as "Coverage:" on Zones page
    coverage: {
      type: String,
      default: "",
      trim: true,
    },
    area: {
      type: Number,
      default: 0,
      comment: "Area in sq km",
    },
    // FIX 6: map center coordinates for each zone
    coordinates: {
      lat: { type: Number, default: 20.5937 },
      lng: { type: Number, default: 78.9629 },
    },

    // ── Species ───────────────────────────────────────────────
    // FIX 1: keyAnimals — PRIMARY field, shown on Zones page
    keyAnimals: [{ type: String, trim: true }],
    // FIX 2: keyPlants — shown on Zones page
    keyPlants: [{ type: String, trim: true }],
    // FIX 9: keySpecies kept for backward compatibility
    keySpecies: [{ type: String, trim: true }],
    ecosystems: [{ type: String, trim: true }],

    // ── Climate & Environment ─────────────────────────────────
    // FIX 4: climate info
    climate: {
      type: String,
      default: "",
      trim: true,
    },
    // FIX 5: biodiversity index for analytics
    biodiversityIndex: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // ── Protected Areas ───────────────────────────────────────
    // FIX 7: national parks list
    nationalParks: [{ type: String, trim: true }],
    // FIX 8: wildlife sanctuaries list
    wildlifeSanctuaries: [{ type: String, trim: true }],

    // ── Image ─────────────────────────────────────────────────
    image: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual: stateCount ─────────────────────────────────────
// FIX 10: used by Zones page header "X States"
zoneSchema.virtual("stateCount").get(function () {
  return this.statesCovered ? this.statesCovered.length : 0;
});

// ─── Indexes ─────────────────────────────────────────────────
zoneSchema.index({ zoneName: "text", description: "text" });
zoneSchema.index({ zoneName: 1 });

module.exports = mongoose.model("Zone", zoneSchema);