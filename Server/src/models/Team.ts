import mongoose from "mongoose";

// Fields below the ingested name/colour pair come from scripts/seedTeams.ts.
// OpenF1 has no team endpoint at all — teams are reconstructed from the
// drivers entered in a session, which carry only a team name and colour — so
// everything else has to be seeded by hand.
//
// The ingest writes name and color with $set and touches nothing else, so a
// re-ingest never clears seeded values.

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

    // ─── Seeded ───────────────────────────────────────────────────────────
    // Stable: change once a decade, if ever.
    fullName: { type: String, default: null },
    base: { type: String, default: null },
    // First championship season under any name in this team's unbroken
    // lineage, which is usually far earlier than the current name suggests.
    entered: { type: Number, default: null },
    enteredAs: { type: String, default: null },
    constructorsTitles: { type: Number, default: null },
    // Previous identities, oldest first.
    lineage: { type: [String], default: [] },
    blurb: { type: String, default: null },

    // Volatile: these move most off-seasons and need reviewing yearly.
    owner: { type: String, default: null },
    principal: { type: String, default: null },
    powerUnit: { type: String, default: null },
    titleSponsor: { type: String, default: null },

    // When the seed last wrote to this document, so stale rows are findable.
    seededAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);


export default mongoose.model(
  "Team",
  teamSchema
);