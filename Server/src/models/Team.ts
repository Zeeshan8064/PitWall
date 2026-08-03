import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },

    shortName: {
      type: String,
    },

    country: {
      type: String,
    },

    color: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);


export default mongoose.model(
  "Team",
  teamSchema
);