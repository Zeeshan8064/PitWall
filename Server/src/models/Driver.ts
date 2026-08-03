import mongoose from "mongoose";


const driverSchema = new mongoose.Schema(
  {
    driverNumber: {
      type: Number,
      required: true,
      unique: true,
    },

    firstName: {
      type: String,
      required: true,
    },

    lastName: {
      type: String,
      required: true,
    },

    abbreviation: {
      type: String,
    },

    nationality: {
      type: String,
    },

    // Only obtainable from OpenF1, so it is stored rather than re-fetched.
    headshotUrl: {
      type: String,
    },

    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },
  },
  {
    timestamps: true,
  }
);


export default mongoose.model(
  "Driver",
  driverSchema
);