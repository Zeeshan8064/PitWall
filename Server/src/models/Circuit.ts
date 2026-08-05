import mongoose from "mongoose";

const circuitSchema = new mongoose.Schema(
  {
    circuitKey: {
      type: Number,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      index: true,
    },

    location: {
      type: String,
      required: true,
    },

    country: {
      type: String,
      required: true,
    },

    circuitType: {
      type: String,
      required: true,
    },

    latitude: {
      type: Number,
    },

    longitude: {
      type: Number,
    },

    totalLaps: {
      type: Number,
      required: false, //manually
    },

    circuitLength: {
      type: Number, // km
      required: false,
    },

    turns: {
      type: Number,
      required: false, //manually
    },

    // Normalised SVG path traced from car position telemetry, inside a
    // 100x100 viewBox. Only the finished path is stored — the /location
    // samples it is derived from are thousands of rows and serve no other
    // purpose. Generated once; a circuit's shape does not change per session.
    outlinePath: {
      type: String,
      default: null,
    },

    // Provenance, so an outline that looks wrong can be traced back to the
    // exact lap it came from and regenerated without guesswork.
    outlineMeta: {
      season: { type: Number, default: null },
      sessionKey: { type: Number, default: null },
      driverNumber: { type: Number, default: null },
      lapNumber: { type: Number, default: null },
      generatedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Circuit", circuitSchema);