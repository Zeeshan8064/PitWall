import dotenv from "dotenv";
import mongoose from "mongoose";

import { backfillCircuitOutlines } from "../services/ingestService";
// Registers every schema, which the Race -> Circuit ref depends on.
import "../models";

dotenv.config();

// Usage: npm run outlines -- 2026
//
// Traces circuit outlines for a season that has already been ingested, so
// adding outlines does not require re-fetching session data. Safe to re-run:
// circuits that already have an outline are left alone.
async function main() {
  const year = Number(process.argv.find((arg) => !arg.startsWith("--") && /^\d{4}$/.test(arg)));

  if (!Number.isFinite(year)) {
    console.error("Usage: npm run outlines -- <year>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI!);
  console.log(`Connected. Tracing circuit outlines from ${year} sessions...`);

  const startedAt = Date.now();

  try {
    const summary = await backfillCircuitOutlines(year);
    const minutes = ((Date.now() - startedAt) / 60_000).toFixed(1);

    console.log(`\n─── Outline backfill complete in ${minutes} min ───`);
    console.log(`  Total circuits : ${summary.total}`);
    console.log(`  Traced         : ${summary.traced}`);
    console.log(`  Skipped        : ${summary.skipped} (already had an outline)`);
    console.log(`  Failed         : ${summary.failed}`);

    if (summary.failures.length > 0) {
      console.log("\n  Failures — these keep their fallback shape:");
      for (const failure of summary.failures) {
        console.log(`    · ${failure}`);
      }
      console.log("\n  Re-running is safe and will retry only these.");
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
