import dotenv from "dotenv";
import mongoose from "mongoose";

import { formatReport, verifyIntegrity } from "../services/integrityService";
import "../models";

dotenv.config();

const DEFAULT_SEASONS = [2024, 2025, 2026];

// Usage: npm run verify [-- --fix] [-- 2025 2026]
//
// Runs the same integrity report the rebuild finishes with, so the database
// can be re-checked at any time without re-ingesting.
async function main() {
  const args = process.argv.slice(2);
  const fix = args.includes("--fix");

  const seasons = args
    .filter((arg) => /^\d{4}$/.test(arg))
    .map(Number);

  await mongoose.connect(process.env.MONGODB_URI!);

  try {
    const report = await verifyIntegrity(
      seasons.length > 0 ? seasons : DEFAULT_SEASONS,
      { fix, checkCancelled: true }
    );

    console.log(formatReport(report));

    const failed = report.checks.filter((check) => !check.ok);

    if (failed.length > 0) {
      console.log(
        `\n${failed.length} check(s) failing.` +
          (fix ? "" : " Re-run with --fix to repair what can be repaired.")
      );
      process.exitCode = 1;
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
