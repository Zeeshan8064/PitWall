import mongoose from "mongoose";

const pitStopSchema = new mongoose.Schema(
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

    lap: {
      type: Number,
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    // Total pit lane time. Historically identical to pitDuration.
    laneDuration: {
      type: Number,
      default: null,
    },

    pitDuration: {
      type: Number,
      default: null,
    },

    // Stationary time in the box only.
    stopDuration: {
      type: Number,
      default: null,
    },

  },
  {
    timestamps: true,
  }
);

// One pit stop per driver per lap per race
pitStopSchema.index(
  { race: 1, driver: 1, lap: 1 },
  { unique: true }
);

export default mongoose.model("PitStop", pitStopSchema);