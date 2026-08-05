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

    // Derived by joining the sample timestamp against lap start times.
    lapNumber: {
      type: Number,
      default: null,
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

// OpenF1 samples intervals at roughly 2Hz, which is ~26k rows per race and far
// more resolution than any view needs. Ingestion keeps only the last sample of
// each lap, so one row per driver per lap is the grain here (~1.3k per race).
intervalSchema.index(
  { race: 1, driver: 1, lapNumber: 1 },
  { unique: true }
);

export default mongoose.model("Interval", intervalSchema);