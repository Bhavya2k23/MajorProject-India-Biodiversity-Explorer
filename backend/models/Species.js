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
      enum: ["Mammal", "Bird", "Reptile", "Amphibian", "Fish", "Insect", "Plant", "Other"],
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
      comment: "Percentage 0-100",
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
      enum: ["Safe", "Near Threatened", "Vulnerable", "Endangered", "Critically Endangered", "Extinct in Wild", "Extinct"],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Text index for search
speciesSchema.index({ name: "text", scientificName: "text", description: "text" });

module.exports = mongoose.model("Species", speciesSchema);
