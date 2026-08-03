import mongoose from "mongoose";

// Source: OpenF1 `/championship_drivers` endpoint (beta).
// Only available for race sessions — one document per driver per race.
const driverChampionshipSchema = new mongoose.Schema(
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

    pointsStart: {
      type: Number,
      required: true,
    },

    pointsCurrent: {
      type: Number,
      required: true,
    },

    positionStart: {
      type: Number,
      required: true,
    },

    positionCurrent: {
      type: Number,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// One standings entry per driver per race
driverChampionshipSchema.index(
  { race: 1, driver: 1 },
  { unique: true }
);

export default mongoose.model("DriverChampionship", driverChampionshipSchema);