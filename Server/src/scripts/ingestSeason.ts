import dotenv from "dotenv";
import mongoose from "mongoose";

import { ingestSeason } from "../services/ingestService";

dotenv.config();

// Usage: npm run ingest -- 2025 [--force]
//
// Sessions that already hold results are skipped, so an interrupted run can be
// restarted and will pick up where it stopped. --force re-fetches everything.
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const prune = args.includes("--prune");
  const year = Number(args.find((arg) => !arg.startsWith("--")));

  if (!Number.isFinite(year)) {
    console.error("Usage: npm run ingest -- <year> [--force] [--prune]");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI!);
  console.log(
    `Connected. Ingesting ${year}` +
      `${force ? " (forced re-fetch)" : ""}${prune ? " (pruning stale sessions)" : ""}...`
  );

  const startedAt = Date.now();

  try {
    const summary = await ingestSeason(year, { force, prune });
    const minutes = ((Date.now() - startedAt) / 60_000).toFixed(1);

    console.log(
      `Done in ${minutes} min: ${summary.sessions} ingested, ` +
        `${summary.skipped} skipped, of ${summary.of} sessions for ${summary.year}`
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
