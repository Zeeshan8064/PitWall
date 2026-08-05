import mongoose from "mongoose";

// A Driver is a *person*, and nothing about them that changes between seasons
// lives here. Car number and team move with the seat, so they belong on
// DriverEntry — see that model for why.
//
// Identity is the OpenF1 name acronym. Verified stable across 2023-2026: 29
// distinct acronyms, none of which map to more than one full_name. full_name
// itself is not usable as a key ("Kimi Antonelli" vs "Andrea Kimi Antonelli").
const driverSchema = new mongoose.Schema(
  {
    acronym: {
      type: String,
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

    fullName: {
      type: String,
    },

    nationality: {
      type: String,
    },

    // Only obtainable from OpenF1, so it is stored rather than re-fetched.
    headshotUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Driver", driverSchema);
