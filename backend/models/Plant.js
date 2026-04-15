const mongoose = require("mongoose");

const plantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Plant name is required"],
      trim: true,
    },
    scientificName: {
      type: String,
      required: [true, "Scientific name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["Tree", "Shrub", "Herb", "Medicinal", "Grass", "Fern", "Climber", "Epiphyte", "Succulent", "Aquatic", "Other"],
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
    conservationStatus: {
      type: String,
      enum: ["Least Concern", "Near Threatened", "Vulnerable", "Endangered", "Critically Endangered", "Extinct in Wild", "Extinct"],
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
    uses: [String],
    funFacts: [String],
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
  },
  { timestamps: true }
);

// Text index for search
plantSchema.index({ name: "text", scientificName: "text", description: "text", uses: "text" });

module.exports = mongoose.model("Plant", plantSchema);
