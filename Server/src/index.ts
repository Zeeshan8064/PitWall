import dotenv from "dotenv";

import { allowedOriginsSummary, createApp } from "./app";
import { connectToDatabase } from "./lib/db";

dotenv.config();

// Long-lived server entry point, used for local development and for any host
// that runs a persistent process. The serverless entry is api/index.ts.

const PORT = process.env.PORT || 5000;

async function main() {
  const app = createApp();

  await connectToDatabase();
  console.log("✅ MongoDB Connected");

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`   CORS: ${allowedOriginsSummary()}`);
  });
}

main().catch((error) => {
  console.error("❌ Failed to start:", error);
  process.exit(1);
});
