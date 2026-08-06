import type { IncomingMessage, ServerResponse } from "http";

import { createApp } from "../src/app";
import { connectToDatabase } from "../src/lib/db";

// Serverless entry point. Vercel routes every request here (see vercel.json)
// and the Express app handles the routing from there, so nothing in src/routes
// needs to know it is running serverless.
//
// The app is built once per container rather than per request — module scope
// persists across invocations on a warm container, so this is effectively a
// cache.
const app = createApp();

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  try {
    // Cached: opens a connection on a cold start, reuses it afterwards.
    await connectToDatabase();
  } catch (error) {
    console.error("Database connection failed:", error);

    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        message: "Database unavailable",
      })
    );
    return;
  }

  // An Express app is itself an (req, res) handler.
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(
    req,
    res
  );
}
