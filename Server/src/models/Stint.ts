import mongoose from "mongoose";

const stintSchema = new mongoose.Schema(
  {
    race: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Race",
      required: true,
      index: true,
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },

    stintNumber: {
      type: Number,
      required: true,
    },

    // OpenF1 emits "UNKNOWN"/"TEST_UNKNOWN" for some stints; normaliseCompound
    // turns those into null rather than failing the whole document.
    compound: {
      type: String,
      enum: ["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET", null],
      default: null,
    },

    lapStart: {
      type: Number,
      required: true,
    },

    lapEnd: {
      type: Number,
      required: true,
    },

    tyreAgeAtStart: {
      type: Number,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// One stint number per driver per race
stintSchema.index(
  { race: 1, driver: 1, stintNumber: 1 },
  { unique: true }
);

export default mongoose.model("Stint", stintSchema);