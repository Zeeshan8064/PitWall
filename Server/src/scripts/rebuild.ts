import dotenv from "dotenv";
import mongoose from "mongoose";

import {
  backfillCircuitOutlines,
  ingestSeason,
} from "../services/ingestService";
import {
  countCollections,
  dropAllCollections,
  formatReport,
  rebuildIndexes,
  verifyIntegrity,
} from "../services/integrityService";
// Registers every schema so refs and populate() resolve.
import "../models";

dotenv.config();

const SEASONS = [2024, 2025, 2026];

function printCounts(title: string, counts: Record<string, number>) {
  console.log(`\n${title}`);

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  for (const [name, count] of Object.entries(counts)) {
    console.log(`  ${(name + ":").padEnd(28)}${count}`);
  }

  console.log(`  ${"TOTAL:".padEnd(28)}${total}`);

  return total;
}

// Usage: npm run rebuild
//
// Destroys every F1 collection and rebuilds from scratch for SEASONS. 2023 is
// deliberately excluded — its data was bad and is not to be re-ingested.
async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("Connected.");

  // ─── 1. What is about to be destroyed ──────────────────────────────────
  printCounts("=== Before deletion ===", await countCollections());

  // ─── 2. Drop ───────────────────────────────────────────────────────────
  console.log("\n=== Dropping collections ===");
  const dropped = await dropAllCollections();
  console.log(`Dropped: ${dropped.length > 0 ? dropped.join(", ") : "(none existed)"}`);

  // ─── 3. Confirm empty ──────────────────────────────────────────────────
  const after = await countCollections();
  const remaining = printCounts("=== After deletion ===", after);

  if (remaining !== 0) {
    throw new Error(`Database not empty after drop: ${remaining} documents remain`);
  }
  console.log("\nDatabase is empty.");

  // ─── 4. Recreate current schema indexes ────────────────────────────────
  console.log("\n=== Rebuilding indexes ===");
  await rebuildIndexes();
  console.log("Schema indexes created.");

  // ─── 5. Ingest ─────────────────────────────────────────────────────────
  for (const season of SEASONS) {
    console.log(`\n=== Ingesting ${season} ===`);
    const startedAt = Date.now();

    const summary = await ingestSeason(season);

    console.log(
      `${season}: ${summary.sessions} ingested, ${summary.skipped} skipped, ` +
        `of ${summary.of} sessions in ${((Date.now() - startedAt) / 60_000).toFixed(1)} min`
    );
  }

  // ─── 6. Circuit outlines ───────────────────────────────────────────────
  // Outlines are season-invariant, so later seasons fill in circuits whose
  // races in an earlier season have not been run yet.
  for (const season of SEASONS) {
    console.log(`\n=== Circuit outlines from ${season} ===`);
    const summary = await backfillCircuitOutlines(season);
    console.log(
      `traced ${summary.traced}, skipped ${summary.skipped}, failed ${summary.failed}`
    );
  }

  // ─── 7. Verify, repairing anything found ───────────────────────────────
  console.log("\n=== Running integrity verification ===");

  let report = await verifyIntegrity(SEASONS, { fix: true, checkCancelled: true });

  // Re-verify without repairing, so the printed report reflects the final
  // state rather than the state that triggered the repairs.
  if (report.fixes.length > 0) {
    console.log("Repairs applied; re-verifying...");
    const fixes = report.fixes;
    report = await verifyIntegrity(SEASONS, { fix: false, checkCancelled: true });
    report.fixes = fixes;
  }

  console.log(formatReport(report));

  const failed = report.checks.filter((check) => !check.ok);

  if (failed.length > 0) {
    console.log(
      `\n${failed.length} check(s) still failing: ` +
        failed.map((c) => c.name).join(", ")
    );
    process.exitCode = 1;
  } else {
    console.log("\nRebuild complete — database is clean and consistent.");
  }
}

main()
  .catch((error) => {
    console.error("REBUILD FAILED:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
