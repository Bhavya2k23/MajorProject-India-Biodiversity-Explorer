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

const isValidImageUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  // Must be an HTTP(S) URL pointing to an image
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
  // Should have an image extension or be a known image service
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  const hasExtension = imageExtensions.some(ext => trimmed.toLowerCase().includes(ext));
  const knownServices = ["wikimedia", "unsplash", "wikipedia", "cdn", "images"];
  const hasKnownService = knownServices.some(s => trimmed.toLowerCase().includes(s));
  return hasExtension || hasKnownService;
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
    process.stdout.write(`   [${i + 1}/${animals.length}] ${species.name}...\r`);

    // Check if species has a valid image already
    const hasValidImage = isValidImageUrl(species.imageUrl) ||
                          (species.images && species.images.length > 0 && isValidImageUrl(species.images[0]));

    if (hasValidImage) {
      speciesAlreadyGood++;
      continue;
    }

    // Try to fetch image from Wikipedia
    try {
      const imageUrl = await fetchSpeciesImage(species.name, species.scientificName);

      if (imageUrl && await validateImageUrl(imageUrl)) {
        species.imageUrl = imageUrl;
        species.images = [imageUrl];
        species.image = imageUrl;
        await species.save();
        speciesFixed++;
      } else {
        // Use type-based fallback
        const fallback = getTypeBasedFallback(species.type);
        species.imageUrl = fallback;
        species.images = [fallback];
        species.image = fallback;
        await species.save();
        speciesFixed++;
      }
    } catch (err) {
      console.error(`\n   ⚠️  Failed to fix ${species.name}: ${err.message}`);
      speciesFailed++;
    }

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\n   ✅ Animals processed: ${animals.length}`);

  // ─── Fix Plants ───────────────────────────────────────────────
  console.log("\n🌿 Processing Plants (Plant collection)...");
  const plants = await Plant.find({});
  totalSpecies += plants.length;

  for (let i = 0; i < plants.length; i++) {
    const plant = plants[i];
    process.stdout.write(`   [${i + 1}/${plants.length}] ${plant.name}...\r`);

    // Check if plant has a valid image already
    const hasValidImage = isValidImageUrl(plant.imageUrl) ||
                          (plant.images && plant.images.length > 0 && isValidImageUrl(plant.images[0]));

    if (hasValidImage) {
      speciesAlreadyGood++;
      continue;
    }

    // Try to fetch image from Wikipedia
    try {
      const imageUrl = await fetchSpeciesImage(plant.name, plant.scientificName);

      if (imageUrl && await validateImageUrl(imageUrl)) {
        plant.imageUrl = imageUrl;
        plant.images = [imageUrl];
        await plant.save();
        speciesFixed++;
      } else {
        // Use plant fallback
        const fallback = getTypeBasedFallback("Plant");
        plant.imageUrl = fallback;
        plant.images = [fallback];
        await plant.save();
        speciesFixed++;
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