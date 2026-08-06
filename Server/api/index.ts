import type { IncomingMessage, ServerResponse } from "http";

import { createApp } from "../src/createApp";
import { connectToDatabase } from "../src/lib/db";

// Serverless entry point. Vercel routes every request here (see vercel.json)
// and the Express app handles routing from there, so nothing in src/routes
// needs to know it is running serverless.
//
// Nothing is constructed at module scope. Anything that throws while a
// serverless module is being imported surfaces only as
// FUNCTION_INVOCATION_FAILED with no message, which is impossible to diagnose
// from the outside — a missing CORS_ORIGINS would look identical to a syntax
// error. Building lazily lets the real reason be returned as JSON.

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let app: Handler | null = null;
let buildError: Error | null = null;

function getApp(): Handler {
  if (buildError) throw buildError;

  if (!app) {
    try {
      app = createApp() as unknown as Handler;
    } catch (error) {
      buildError = error instanceof Error ? error : new Error(String(error));
      throw buildError;
    }
  }

  return app;
}

function fail(res: ServerResponse, status: number, message: string) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ success: false, message }));
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  let instance: Handler;

  try {
    instance = getApp();
  } catch (error) {
    console.error("App failed to build:", error);

    return fail(
      res,
      500,
      // Configuration mistakes are the overwhelmingly likely cause here and
      // the message is ours, not an internal detail, so it is safe to return.
      error instanceof Error ? error.message : "Server misconfigured"
    );
  }

  try {
    // Cached: opens a connection on a cold start, reuses it afterwards.
    await connectToDatabase();
  } catch (error) {
    console.error("Database connection failed:", error);

    return fail(
      res,
      503,
      "Database unavailable — check MONGODB_URI and the Atlas IP allowlist"
    );
  }

  return instance(req, res);
}
