const mongoose = require("mongoose");

const zoneSchema = new mongoose.Schema(
  {
    zoneName: {
      type: String,
      required: [true, "Zone name is required"],
      trim: true,
      unique: true,
    },
    statesCovered: [{ type: String, trim: true }],
    keySpecies: [{ type: String, trim: true }],
    ecosystems: [{ type: String, trim: true }],
    description: {
      type: String,
      required: true,
    },
    area: { type: Number, default: 0 },
    image: { type: String, default: "" },
  },
  { timestamps: true }
);

zoneSchema.index({ zoneName: "text", description: "text" });

module.exports = mongoose.model("Zone", zoneSchema);
