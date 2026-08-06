import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import routes from "./routes";
import { rateLimit } from "./middleware/rateLimit";
import { connectToDatabase } from "./lib/db";
// Registers every schema with mongoose so `ref`/populate() resolve.
import "./models";

dotenv.config();

// Single entrypoint for both ways this runs.
//
// Vercel detects an Express project by finding a module that imports express
// and default-exports the app, then serves that app itself — there is no api/
// directory and no rewrite involved. Locally the same module listens on a
// port. Splitting the app across files fails detection outright:
// "No entrypoint found which imports express".

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Unset means development: allow anything, since the dev server's port moves
// around. In production an unset value would silently leave the API open to
// every site on the internet, so it is required there.
if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
  throw new Error(
    "CORS_ORIGINS must be set in production — refusing to serve with an open API."
  );
}

app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : true }));
app.use(express.json({ limit: "100kb" }));

// Connect before anything touches the database. Cached, so this is a no-op
// after the first request — but it has to be middleware rather than a one-off
// at startup, because a serverless container can serve its first request
// before any startup code would have finished.
app.use(async (_req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(503).json({
      success: false,
      message:
        "Database unavailable — check MONGODB_URI and the Atlas IP allowlist",
    });
  }
});

// The expensive endpoints — /race-data returns ~1,400 laps, /strategy fits a
// regression over every lap in a race — are the reason this exists.
app.use("/api", rateLimit());

app.use("/api/races", routes);

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

// Only listen when running as a normal process. On Vercel the platform serves
// the exported app and calling listen() would be pointless.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(
      `   CORS: ${
        allowedOrigins.length > 0 ? allowedOrigins.join(", ") : "open (development)"
      }`
    );
  });
}

export default app;
