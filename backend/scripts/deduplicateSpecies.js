// ============================================================
// FILE: backend/scripts/deduplicateSpecies.js
//
// PURPOSE:
//   Identifies and merges duplicate Species (animals) and Plant
//   records where the common name is the same when normalised
//   (case-insensitive, trimmed, collapsed whitespace).
//
// WHAT IT DOES FOR EACH DUPLICATE GROUP:
//   1. Keeps ONE primary record (longest description wins)
//   2. Merges zones          → zones[] array (all unique values)
//   3. Merges ecosystems     → ecosystems[] array (all unique values)
//   4. Merges images         → images[] union of valid URLs
//   5. Picks most critical   conservationStatus
//   6. Unions threats / funFacts / uses arrays
//   7. Re-points User.favorites / User.plantFavorites → primary._id
//   8. Deletes all secondary (redundant) records
//   9. Prints a full merge log + before/after counts
//
// SAFE TO RE-RUN: idempotent — if no duplicates exist it exits cleanly.
//
// USAGE:
//   node backend/scripts/deduplicateSpecies.js
// ============================================================

"use strict";

require("dotenv").config();
const mongoose = require("mongoose");

// ─── Models ───────────────────────────────────────────────────
const Species           = require("../models/Species");
const Plant             = require("../models/Plant");
const User              = require("../models/User");
const PredictionHistory = require("../models/PredictionHistory");

// ─── Conservation Status Priority ────────────────────────────
// Higher index = more critical. Most critical status wins.
const STATUS_PRIORITY = [
  "Least Concern",
  "Near Threatened",
  "Vulnerable",
  "Endangered",
  "Critically Endangered",
  "Extinct in Wild",
  "Extinct",
];

// ─── Helpers ──────────────────────────────────────────────────

/** Normalise a name for grouping: lower-case, trimmed, collapsed spaces */
const normaliseName = (name) =>
  (name || "").toLowerCase().trim().replace(/\s+/g, " ");

/** Return the status with the highest priority (most critical) */
const mostCritical = (statuses) => {
  let best = -1;
  let bestStatus = "Least Concern";
  for (const s of statuses) {
    const idx = STATUS_PRIORITY.indexOf(s);
    if (idx > best) { best = idx; bestStatus = s; }
  }
  return bestStatus;
};

/** Union two arrays, deduplicated, truthy values only */
const unionArr = (arrays) => [...new Set(arrays.flat().filter(Boolean))];

/** Filter image URLs — keep only http URLs and /uploads/ paths */
const validImage = (url) =>
  typeof url === "string" && (url.startsWith("http") || url.startsWith("/uploads/"));

/** Merge images from a group of records */
const mergeImages = (records) => {
  const all = [];
  for (const r of records) {
    if (validImage(r.imageUrl)) all.push(r.imageUrl);
    if (Array.isArray(r.images)) all.push(...r.images.filter(validImage));
  }
  return [...new Set(all)]; // unique URLs
};

/** Pick the record with the longest description */
const bestRecord = (records) =>
  records.reduce((best, r) =>
    (r.description || "").length > (best.description || "").length ? r : best
  );

// ─── Core: deduplicate one collection ────────────────────────

/**
 * @param {mongoose.Model} Model
 * @param {string}         favField   - field on User that references this model
 *                                      ("favorites" | "plantFavorites")
 * @param {string}         label      - "Species" | "Plant"
 * @returns {{ merged: number, removed: number, log: string[] }}
 */
async function deduplicateCollection(Model, favField, label) {
  const log       = [];
  let   merged    = 0;
  let   removed   = 0;

  // 1. Fetch all records (only fields we need for merging)
  const all = await Model.find({}).select(
    "name normalizedName scientificName type zone zones ecosystem imageUrl images " +
    "conservationStatus description funFacts threats uses floweringSeason diet " +
    "population habitatLoss pollutionLevel climateRisk habitat region states " +
    "coordinates isFeatured featureVector createdAt _id"
  ).lean();

  // 2. Group by normalised name
  const groups = new Map(); // normalizedName → [ records ]
  for (const doc of all) {
    const key = normaliseName(doc.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(doc);
  }

  // 3. Process each group that has more than 1 member
  for (const [normName, records] of groups.entries()) {
    if (records.length <= 1) continue;

    // Pick primary (longest description)
    const primary    = bestRecord(records);
    const secondaries = records.filter((r) => String(r._id) !== String(primary._id));
    const allIds     = records.map((r) => r._id);
    const secondaryIds = secondaries.map((r) => r._id);

    // Merge fields
    const mergedZones      = unionArr(records.map((r) => [r.zone, ...(r.zones || [])]));
    const mergedEcosystems = unionArr(records.map((r) => [r.ecosystem]));
    const mergedImages     = mergeImages(records);
    const bestStatus       = mostCritical(records.map((r) => r.conservationStatus).filter(Boolean));
    const mergedThreats    = unionArr(records.map((r) => r.threats || []));
    const mergedFunFacts   = unionArr(records.map((r) => r.funFacts || []));
    const mergedUses       = unionArr(records.map((r) => r.uses    || []));

    // Best population = max across records (not average — largest known population is safest)
    const bestPopulation   = Math.max(...records.map((r) => r.population || 0));

    // Build update payload
    const update = {
      normalizedName:     normName,
      zones:              mergedZones,
      images:             mergedImages,
      imageUrl:           mergedImages[0] || primary.imageUrl || "",
      conservationStatus: bestStatus,
      threats:            mergedThreats,
      funFacts:           mergedFunFacts,
      population:         bestPopulation,
    };
    if (mergedUses.length)        update.uses        = mergedUses;
    if (mergedEcosystems.length)  update.ecosystems  = mergedEcosystems; // stored in new field

    // 4. Update primary record
    await Model.findByIdAndUpdate(primary._id, { $set: update }, { runValidators: false });

    // 5. Re-point User favorites from secondary IDs → primary ID
    if (secondaryIds.length > 0) {
      // Step a: remove secondary IDs from the favorites array
      await User.updateMany(
        { [favField]: { $in: secondaryIds } },
        { $pull: { [favField]: { $in: secondaryIds } } }
      );
      // Step b: add primary ID to those users if not already there
      // (find users who had a secondary but may not have primary)
      await User.updateMany(
        { [favField]: { $in: allIds } }, // already had any from this group
        { $addToSet: { [favField]: primary._id } }
      );
    }

    // 6. Delete secondary records
    await Model.deleteMany({ _id: { $in: secondaryIds } });

    // 7. Log this merge
    const logLine = `[${label}] "${primary.name}" — merged ${records.length} → 1 ` +
      `| zones: ${mergedZones.join(", ")} | status: ${bestStatus} ` +
      `| images: ${mergedImages.length} | removed IDs: ${secondaryIds.join(", ")}`;
    log.push(logLine);
    merged++;
    removed += secondaryIds.length;
  }

  return { merged, removed, log };
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!MONGO_URI) {
    console.error("❌  MONGO_URI / MONGODB_URI not set in .env");
    process.exit(1);
  }

  console.log("🔍  India Biodiversity Explorer — Deduplication Script");
  console.log("═".repeat(60));

  await mongoose.connect(MONGO_URI);
  console.log("✅  MongoDB connected\n");

  // ── Before counts ──────────────────────────────────────────
  const [beforeSpecies, beforePlants] = await Promise.all([
    Species.countDocuments(),
    Plant.countDocuments(),
  ]);
  console.log(`📊  BEFORE — Species (animals): ${beforeSpecies} | Plants: ${beforePlants}`);
  console.log("─".repeat(60));

  // ── Deduplicate Species (animals) ─────────────────────────
  console.log("\n🐾  Deduplicating Species (animals)…");
  const speciesResult = await deduplicateCollection(Species, "favorites", "Species");
  console.log(`   Groups merged:    ${speciesResult.merged}`);
  console.log(`   Records removed:  ${speciesResult.removed}`);

  // ── Deduplicate Plants ────────────────────────────────────
  console.log("\n🌿  Deduplicating Plants…");
  const plantResult = await deduplicateCollection(Plant, "plantFavorites", "Plant");
  console.log(`   Groups merged:    ${plantResult.merged}`);
  console.log(`   Records removed:  ${plantResult.removed}`);

  // ── After counts ───────────────────────────────────────────
  const [afterSpecies, afterPlants] = await Promise.all([
    Species.countDocuments(),
    Plant.countDocuments(),
  ]);
  console.log("\n" + "─".repeat(60));
  console.log(`📊  AFTER  — Species (animals): ${afterSpecies} | Plants: ${afterPlants}`);
  console.log(`   Removed: ${beforeSpecies - afterSpecies} animals, ${beforePlants - afterPlants} plants`);
  console.log("─".repeat(60));

  // ── Full merge log ─────────────────────────────────────────
  if (speciesResult.log.length > 0 || plantResult.log.length > 0) {
    console.log("\n📋  MERGE LOG:");
    [...speciesResult.log, ...plantResult.log].forEach((line) => console.log("   " + line));
  } else {
    console.log("\n✅  No duplicates found — database is clean.");
  }

  // ── Validate: check for remaining duplicates ───────────────
  console.log("\n🔎  Validating uniqueness…");
  const [dupSpecies, dupPlants] = await Promise.all([
    Species.aggregate([
      { $group: { _id: { $toLower: { $trim: { input: "$name" } } }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]),
    Plant.aggregate([
      { $group: { _id: { $toLower: { $trim: { input: "$name" } } }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]),
  ]);

  if (dupSpecies.length === 0 && dupPlants.length === 0) {
    console.log("   ✅  All names are unique. No duplicates remain.");
  } else {
    console.log(`   ⚠️  Remaining Species duplicates: ${dupSpecies.length}`);
    console.log(`   ⚠️  Remaining Plant duplicates:   ${dupPlants.length}`);
    dupSpecies.forEach((d) => console.log(`      Species: "${d._id}" × ${d.count}`));
    dupPlants.forEach((d)  => console.log(`      Plant:   "${d._id}" × ${d.count}`));
  }

  console.log("\n🎉  Deduplication complete!\n");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌  Fatal error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
