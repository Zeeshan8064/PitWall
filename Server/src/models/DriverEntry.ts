import mongoose from "mongoose";

const driverEntrySchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },

    season: {
      type: Number,
      required: true,
      index: true,
    },

    driverNumber: {
      type: Number,
      required: true,
      index: true,
    },

    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// A car number identifies exactly one driver within a season.
driverEntrySchema.index({ season: 1, driverNumber: 1 }, { unique: true });

// NOT unique: a driver can hold more than one number in a season. Substitutes
// race under their own number for the team they stand in for, so 2024 has
// Bearman entered under two numbers. An earlier unique index here failed
// against real data.
driverEntrySchema.index({ season: 1, driver: 1 });

export default mongoose.model("DriverEntry", driverEntrySchema);
