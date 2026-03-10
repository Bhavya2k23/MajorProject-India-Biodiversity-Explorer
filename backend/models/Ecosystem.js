const mongoose = require("mongoose");

const ecosystemSchema = new mongoose.Schema(
  {
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
    keySpecies: [{ type: String, trim: true }],
    zone: {
      type: String,
      required: true,
      trim: true,
    },
    majorThreats: [{ type: String, trim: true }],
    area: { type: Number, default: 0, comment: "in sq km" },
    image: { type: String, default: "" },
  },
  { timestamps: true }
);

ecosystemSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Ecosystem", ecosystemSchema);
