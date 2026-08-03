import mongoose from "mongoose";

// Source: OpenF1 `/championship_teams` endpoint (beta).
// Only available for race sessions — one document per team per race.
const constructorsChampionshipSchema = new mongoose.Schema(
  {
    race: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Race",
      required: true,
      index: true,
    },

    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },

    pointsStart: {
      type: Number,
      required: true,
    },

    pointsCurrent: {
      type: Number,
      required: true,
    },

    positionStart: {
      type: Number,
      required: true,
    },

    positionCurrent: {
      type: Number,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// One standings entry per team per race
constructorsChampionshipSchema.index(
  { race: 1, team: 1 },
  { unique: true }
);

export default mongoose.model(
  "ConstructorsChampionship",
  constructorsChampionshipSchema
);