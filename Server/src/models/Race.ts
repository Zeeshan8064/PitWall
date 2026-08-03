import mongoose from "mongoose";

const raceSchema = new mongoose.Schema(
  {
    sessionKey: {
      type: Number,
      required: true,
      unique: true,
    },

    meetingKey: {
      type: Number,
      required: true,
      index: true,
    },

    season: {
      type: Number,
      required: true,
      index: true,
    },

    round: {
      type: Number,
      required: true,
    },

    officialName: {
      type: String,
      required: true,
    },

    meetingName: {
      type: String,
      required: true,
    },

    circuit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Circuit",
      required: true,
      index: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
raceSchema.index({ season: 1, round: 1 }, { unique: true });
export default mongoose.model("Race", raceSchema);