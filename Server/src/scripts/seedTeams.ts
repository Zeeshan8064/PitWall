import dotenv from "dotenv";
import mongoose from "mongoose";

import { TEAM_SEED } from "../data/teamSeed";
import { Team } from "../models";
import { toSlug } from "../utils/slug";
import "../models";

dotenv.config();

// Usage: npm run seed:teams
//
// Writes hand-maintained team background onto the ingested Team documents.
// Idempotent and safe to re-run: it only ever $sets the seeded fields, so the
// ingested name and colour are untouched, and running it twice changes
// nothing except seededAt.
async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("Connected.");

  const teams: any[] = await Team.find({}, { name: 1 }).lean();

  const bySlug = new Map(teams.map((team) => [toSlug(team.name), team]));

  let updated = 0;
  const unmatchedSeeds: string[] = [];
  const unseededTeams: string[] = [];

  for (const [slug, seed] of Object.entries(TEAM_SEED)) {
    const team = bySlug.get(slug);

    if (!team) {
      unmatchedSeeds.push(slug);
      continue;
    }

    await Team.updateOne(
      { _id: team._id },
      {
        $set: {
          fullName: seed.fullName,
          shortName: seed.shortName,
          country: seed.country,
          base: seed.base,
          entered: seed.entered,
          enteredAs: seed.enteredAs ?? null,
          owner: seed.owner,
          principal: seed.principal,
          powerUnit: seed.powerUnit,
          titleSponsor: seed.titleSponsor ?? null,
          constructorsTitles: seed.constructorsTitles,
          lineage: seed.lineage ?? [],
          blurb: seed.blurb,
          seededAt: new Date(),
        },
      }
    );

    updated++;
    console.log(`  ${team.name.padEnd(20)} seeded`);
  }

  // Teams in the database with no seed entry. Expected for constructors that
  // only appear in older seasons, but worth surfacing rather than hiding.
  for (const [slug, team] of bySlug) {
    if (!TEAM_SEED[slug]) unseededTeams.push(`${team.name} (${slug})`);
  }

  console.log(`\n─── Team seed complete ───`);
  console.log(`  Teams in database : ${teams.length}`);
  console.log(`  Seeded            : ${updated}`);
  console.log(`  Without seed data : ${unseededTeams.length}`);

  if (unseededTeams.length > 0) {
    console.log("\n  No seed entry for:");
    for (const name of unseededTeams) console.log(`    · ${name}`);
  }

  if (unmatchedSeeds.length > 0) {
    // A seed key that matches nothing usually means a team was renamed and
    // the key here was not updated with it.
    console.log("\n  Seed entries matching no team (check the slug):");
    for (const slug of unmatchedSeeds) console.log(`    · ${slug}`);
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
