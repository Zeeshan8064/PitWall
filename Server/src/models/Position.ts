import mongoose from "mongoose";

const positionSchema = new mongoose.Schema(
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

    // /position carries no lap number — it is a timestamped feed. This is
    // derived by joining against lap start times, so it can be null.
    lapNumber: {
      type: Number,
      default: null,
    },

    position: {
      type: Number,
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Positions are sampled repeatedly per driver per race, keyed by timestamp —
// a driver has many position rows within a single lap.
positionSchema.index(
  { race: 1, driver: 1, date: 1 },
  { unique: true }
);

export default mongoose.model("Position", positionSchema);