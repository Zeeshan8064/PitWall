import mongoose from "mongoose";

const intervalSchema = new mongoose.Schema(
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

    date: {
      type: Date,
      required: true,
    },

    interval: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    gapToLeader: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Intervals are sampled repeatedly per driver per race, keyed by timestamp
intervalSchema.index(
  { race: 1, driver: 1, date: 1 },
  { unique: true }
);

export default mongoose.model("Interval", intervalSchema);