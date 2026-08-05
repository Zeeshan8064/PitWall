import mongoose from "mongoose";

import { REPLAY_SESSION_TYPES, SESSION_TYPES } from "../constants";

// One document per *session*, not per race weekend — a sprint weekend produces
// four. The collection name predates that and is kept so the existing `race`
// refs on Lap/Stint/Position/Interval/PitStop/RaceResult stay valid.
//
// Meeting fields (round, names, circuit) repeat across a weekend's sessions.
const raceSchema = new mongoose.Schema(
  {
    sessionKey: {
      type: Number,
      required: true,
      unique: true,
    },

    sessionType: {
      type: String,
      enum: REPLAY_SESSION_TYPES,
      required: true,
      default: SESSION_TYPES.RACE,
      index: true,
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
// Was { season, round } unique, which allowed only one session per round. The
// old index must be dropped from an existing database or ingest will fail on
// the second session of a weekend — see ensureSessionIndexes in ingestService.
raceSchema.index({ season: 1, round: 1, sessionType: 1 }, { unique: true });
export default mongoose.model("Race", raceSchema);