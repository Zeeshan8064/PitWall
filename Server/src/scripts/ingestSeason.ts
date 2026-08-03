import dotenv from "dotenv";
import mongoose from "mongoose";

import { ingestSeason } from "../services/ingestService";

dotenv.config();

// Usage: npm run ingest -- 2025
async function main() {
  const year = Number(process.argv[2]);

  if (!Number.isFinite(year)) {
    console.error("Usage: npm run ingest -- <year>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI!);
  console.log(`Connected. Ingesting ${year}...`);

  try {
    const summary = await ingestSeason(year);
    console.log(
      `Done: ${summary.races}/${summary.of} races ingested for ${summary.year}`
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
