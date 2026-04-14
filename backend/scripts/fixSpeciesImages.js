/**
 * Script: fixSpeciesImages.js
 * Purpose: Fix all species in the database by ensuring they have valid image URLs
 * - Fetches missing images from Wikipedia/Wikimedia
 * - Updates database with valid images
 * - Ensures permanent fix across sessions
 *
 * Run: node scripts/fixSpeciesImages.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Species = require("../models/Species");
const Plant = require("../models/Plant");
const { fetchSpeciesImage, validateImageUrl, getFallbackImage, getTypeBasedFallback } = require("../services/imageService");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// Counters for reporting
let totalSpecies = 0;
let speciesFixed = 0;
let speciesFailed = 0;
let speciesAlreadyGood = 0;

/**
 * Strictly validate whether a URL looks like a real, fetchable image.
 *
 * Rejects:
 *  - falsy / non-string / whitespace-only values
 *  - the literal strings "null", "undefined", "none", "N/A", etc.
 *  - any known placeholder / dummy patterns
 *  - URLs that don't start with http:// or https://
 *  - Wikipedia *article* pages (en.wikipedia.org/wiki/…) — these are HTML, not images
 *  - URLs that lack both a recognised image extension AND a known image-CDN hostname
 *    (this prevents bare /cdn/ or /images/ path segments from falsely passing)
 */
const isValidImageUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Reject known non-value strings
  const invalidLiterals = ["null", "undefined", "none", "n/a", "na", "placeholder",
                           "no-image", "no_image", "noimage", "default", "missing"];
  if (invalidLiterals.includes(trimmed.toLowerCase())) return false;

  // Must be an absolute HTTP(S) URL
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false; // not a valid URL at all
  }

  // Reject Wikipedia article pages — they return HTML, not image data
  // e.g. https://en.wikipedia.org/wiki/Tiger
  if (parsed.hostname.includes("wikipedia.org") && parsed.pathname.startsWith("/wiki/")) {
    return false;
  }

  // Accept if URL has a recognised image file extension anywhere in the path
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  const hasImageExtension = imageExtensions.some(ext => parsed.pathname.toLowerCase().includes(ext));
  if (hasImageExtension) return true;

  // Accept if the hostname itself is a known image CDN / service
  const imageCdnHosts = ["wikimedia.org", "upload.wikimedia.org",
                         "images.unsplash.com", "unsplash.com",
                         "commons.wikimedia.org"];
  const hasImageCdnHost = imageCdnHosts.some(h => parsed.hostname.includes(h));
  if (hasImageCdnHost) return true;

  // Everything else is treated as not a valid image URL
  return false;
};

const fixSpeciesImages = async () => {
  console.log("🖼️  Species Image Fix Script");
  console.log("═".repeat(48));

  await mongoose.connect(MONGO_URI);
  console.log("✅ MongoDB connected\n");

  // ─── Fix Animals (Species) ───────────────────────────────────
  console.log("🐾 Processing Animals (Species collection)...");
  const animals = await Species.find({});
  totalSpecies += animals.length;

  for (let i = 0; i < animals.length; i++) {
    const species = animals[i];
    process.stdout.write(`   [${i + 1}/${animals.length}] ${species.name}...                \r`);

    // Collect all candidate URLs stored on this document
    const candidateUrls = [
      species.imageUrl,
      species.image,
      ...(Array.isArray(species.images) ? species.images : []),
    ];

    // A stored URL is only "good" if it passes the strict local check AND the
    // live HTTP validation (confirms the remote server actually returns image data).
    let confirmedUrl = null;
    for (const candidate of candidateUrls) {
      if (isValidImageUrl(candidate)) {
        const live = await validateImageUrl(candidate);
        if (live) { confirmedUrl = candidate; break; }
      }
    }

    if (confirmedUrl) {
      // Ensure all three fields are in sync with the confirmed URL
      if (species.imageUrl !== confirmedUrl || species.image !== confirmedUrl ||
          !species.images || species.images[0] !== confirmedUrl) {
        species.imageUrl = confirmedUrl;
        species.images = [confirmedUrl];
        species.image = confirmedUrl;
        await species.save();
      }
      speciesAlreadyGood++;
      continue;
    }

    // No valid image found locally — fetch a fresh one from Wikipedia/Wikimedia
    try {
      const fetchedUrl = await fetchSpeciesImage(species.name, species.scientificName);

      if (fetchedUrl && await validateImageUrl(fetchedUrl)) {
        species.imageUrl = fetchedUrl;
        species.images = [fetchedUrl];
        species.image = fetchedUrl;
        await species.save();
        speciesFixed++;
        process.stdout.write(`   [${i + 1}/${animals.length}] ${species.name}: fetched OK          \n`);
      } else {
        // Wikipedia fetch failed or returned an inaccessible URL — use themed fallback
        const fallback = getTypeBasedFallback(species.type);
        species.imageUrl = fallback;
        species.images = [fallback];
        species.image = fallback;
        await species.save();
        speciesFixed++;
        process.stdout.write(`   [${i + 1}/${animals.length}] ${species.name}: fallback applied     \n`);
      }
    } catch (err) {
      console.error(`\n   ⚠️  Failed to fix ${species.name}: ${err.message}`);
      speciesFailed++;
    }

    // Small delay to avoid overwhelming the Wikipedia API
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\n   ✅ Animals processed: ${animals.length}`);

  // ─── Fix Plants ───────────────────────────────────────────────
  console.log("\n🌿 Processing Plants (Plant collection)...");
  const plants = await Plant.find({});
  totalSpecies += plants.length;

  for (let i = 0; i < plants.length; i++) {
    const plant = plants[i];
    process.stdout.write(`   [${i + 1}/${plants.length}] ${plant.name}...                \r`);

    // Collect all candidate URLs stored on this document
    const candidateUrls = [
      plant.imageUrl,
      ...(Array.isArray(plant.images) ? plant.images : []),
    ];

    // A stored URL is only "good" if it passes the strict local check AND live HTTP validation
    let confirmedUrl = null;
    for (const candidate of candidateUrls) {
      if (isValidImageUrl(candidate)) {
        const live = await validateImageUrl(candidate);
        if (live) { confirmedUrl = candidate; break; }
      }
    }

    if (confirmedUrl) {
      // Ensure both fields are in sync with the confirmed URL
      if (plant.imageUrl !== confirmedUrl || !plant.images || plant.images[0] !== confirmedUrl) {
        plant.imageUrl = confirmedUrl;
        plant.images = [confirmedUrl];
        await plant.save();
      }
      speciesAlreadyGood++;
      continue;
    }

    // No valid image — fetch a fresh one
    try {
      const fetchedUrl = await fetchSpeciesImage(plant.name, plant.scientificName);

      if (fetchedUrl && await validateImageUrl(fetchedUrl)) {
        plant.imageUrl = fetchedUrl;
        plant.images = [fetchedUrl];
        await plant.save();
        speciesFixed++;
        process.stdout.write(`   [${i + 1}/${plants.length}] ${plant.name}: fetched OK          \n`);
      } else {
        // Use plant-themed fallback
        const fallback = getTypeBasedFallback("Plant");
        plant.imageUrl = fallback;
        plant.images = [fallback];
        await plant.save();
        speciesFixed++;
        process.stdout.write(`   [${i + 1}/${plants.length}] ${plant.name}: fallback applied     \n`);
      }
    } catch (err) {
      console.error(`\n   ⚠️  Failed to fix ${plant.name}: ${err.message}`);
      speciesFailed++;
    }

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\n   ✅ Plants processed: ${plants.length}`);

  // ─── Summary ─────────────────────────────────────────────────
  console.log("\n" + "═".repeat(48));
  console.log("📊 SUMMARY");
  console.log("═".repeat(48));
  console.log(`   Total species processed: ${totalSpecies}`);
  console.log(`   Already had valid images: ${speciesAlreadyGood}`);
  console.log(`   Fixed (added/updated images): ${speciesFixed}`);
  console.log(`   Failed: ${speciesFailed}`);
  console.log("\n🎉 Image fix complete!");

  await mongoose.disconnect();
  process.exit(0);
};

fixSpeciesImages().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  process.exit(1);
});