const mongoose = require("mongoose");

const speciesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Species name is required"],
      trim: true,
    },
    scientificName: {
      type: String,
      required: [true, "Scientific name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["Mammal", "Bird", "Reptile", "Amphibian", "Fish", "Insect", "Arachnid", "Crustacean", "Mollusk", "Plant", "Other"],
      required: true,
    },
    zone: {
      type: String,
      required: true,
      trim: true,
    },
    ecosystem: {
      type: String,
      required: true,
      trim: true,
    },
    population: {
      type: Number,
      required: true,
      min: [0, "Population cannot be negative"],
    },
    habitatLoss: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    pollutionLevel: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    climateRisk: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    conservationStatus: {
      type: String,
      enum: ["Least Concern", "Near Threatened", "Vulnerable", "Endangered", "Critically Endangered", "Extinct in Wild", "Extinct"],
      required: true,
      default: "Least Concern"
    },
    description: {
      type: String,
      required: true,
    },
    habitat: {
      type: String,
      default: "",
    },
    threats: [String],
    funFacts: [String],
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      locationName: { type: String, default: "" },
    },
    // CONSOLIDATED: Use imageUrl as primary field (removed duplicate 'image' field)
    imageUrl: {
      type: String,
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
    // Recommendation feature vectors for cosine similarity (optional advanced feature)
    featureVector: {
      ecosystemCode: { type: Number, default: 0 },    // 0-10 scale
      statusCode: { type: Number, default: 0 },      // 0-6 scale
      typeCode: { type: Number, default: 0 },        // 0-7 scale
      zoneCode: { type: Number, default: 0 },        // 0-6 scale
    },
  },
  { timestamps: true }
);

// ============================================
// MONGODB INDEXES FOR RECOMMENDATION QUERIES
// ============================================

// Text index for search
speciesSchema.index({ name: "text", scientificName: "text", description: "text" });

// Recommendation optimization indexes
speciesSchema.index({ ecosystem: 1 });
speciesSchema.index({ conservationStatus: 1 });
speciesSchema.index({ type: 1 });
speciesSchema.index({ zone: 1 });

// Compound index for recommendation queries
speciesSchema.index({ ecosystem: 1, conservationStatus: 1, type: 1 });
speciesSchema.index({ ecosystem: 1, conservationStatus: 1 });
speciesSchema.index({ ecosystem: 1, type: 1 });

// Index for feature vector similarity (optional advanced)
speciesSchema.index({ "featureVector.ecosystemCode": 1, "featureVector.statusCode": 1, "featureVector.typeCode": 1 });

module.exports = mongoose.model("Species", speciesSchema);