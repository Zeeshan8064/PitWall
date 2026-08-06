import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import routes from "./routes";
import { rateLimit } from "./middleware/rateLimit";
// Registers every schema with mongoose so `ref`/populate() resolve.
import "./models";

// The Express app on its own, with no listening and no database connection.
// Both entry points build on this: src/index.ts runs it as a long-lived server,
// api/index.ts hands it to a serverless invocation.

export function createApp() {
  const app = express();

  // Comma-separated list of allowed origins, e.g.
  //   CORS_ORIGINS=https://pitwall.vercel.app,https://pitwall.app
  //
  // Unset means development: allow anything, since the dev server's port moves
  // around. In production an unset value would silently leave the API open to
  // every site on the internet, so it is required there.
  const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
    throw new Error(
      "CORS_ORIGINS must be set in production — refusing to serve with an open API."
    );
  }

  app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : true }));
  app.use(express.json({ limit: "100kb" }));

  // The expensive endpoints — /race-data returns ~1,400 laps, /strategy fits a
  // regression over every lap in a race — are the reason this exists.
  app.use("/api", rateLimit());

  app.use("/api/races", routes);

  // The API root. Explicit rather than falling through to the catch-all:
  // behind Vercel's rewrite the bare "/" resolves differently from every
  // other path and returned an opaque 500, and an API root that describes
  // itself is more useful than a 404 in any case.
  app.get("/", (_req, res) => {
    res.json({
      name: "PitWall API",
      health: "/health",
      endpoints: [
        "/api/races/season/:year",
        "/api/races/drivers",
        "/api/races/teams",
        "/api/races/championship/drivers/:year",
        "/api/races/:sessionKey/race-data",
        "/api/races/:sessionKey/strategy",
      ],
    });
  });

  app.get("/health", (_req, res) => {
    res.json({
      ok: mongoose.connection.readyState === 1,
      uptime: Math.round(process.uptime()),
    });
  });

  // Anything unmatched, rather than an HTML error page from Express.
  app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Not found" });
  });

  return app;
}

export const allowedOriginsSummary = () => {
  const origins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins.join(", ") : "open (development)";
};
