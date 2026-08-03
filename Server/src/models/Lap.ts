import mongoose from "mongoose";

const lapSchema = new mongoose.Schema(
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

    lapNumber: {
      type: Number,
      required: true,
    },

    // Null on in/out laps and on the lap a session is red-flagged.
    lapDuration: {
      type: Number,
      default: null,
    },
    // Not part of the /laps payload — resolved from stint lap ranges.
    compound: {
      type: String,
      enum: ["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET", null],
      default: null,
    },
    stSpeed: {
  type: Number,
},

    durationSector1: Number,

    durationSector2: Number,

    durationSector3: Number,

    position: Number,

    isPitOutLap: Boolean,

    dateStart: Date,
  },
  {
    timestamps: true,
  },
);

// One lap per driver per race
lapSchema.index({ race: 1, driver: 1, lapNumber: 1 }, { unique: true });

export default mongoose.model("Lap", lapSchema);
