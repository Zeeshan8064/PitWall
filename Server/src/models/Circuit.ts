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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Circuit", circuitSchema);