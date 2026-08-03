import mongoose from "mongoose";

// Source: OpenF1 `/session_result`, which supplies finishing position, points
// and the retirement flags directly.
const raceResultSchema = new mongoose.Schema(
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

    // OpenF1's /starting_grid is empty for most sessions, so this is derived
    // from the earliest position sample and may be unavailable.
    gridPosition: {
      type: Number,
      default: null,
    },

    // Null for a driver who did not start.
    finishPosition: {
      type: Number,
      default: null,
      index: true,
    },

    points: {
      type: Number,
      required: true,
      default: 0,
    },

    numberOfLaps: {
      type: Number,
      default: null,
    },

    status: {
      type: String,
      enum: ["FINISHED", "DNF", "DNS", "DSQ"],
      required: true,
    },

    // Numeric seconds for cars on the lead lap, or a string like "+1 LAP".
    gapToLeader: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Total race duration in seconds.
    finishTime: {
      type: Number,
      default: null,
    },

    finalCompound: {
      type: String,
      enum: ["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET", null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

raceResultSchema.index(
  { race: 1, driver: 1 },
  { unique: true }
);

export default mongoose.model("RaceResult", raceResultSchema);
