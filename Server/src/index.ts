import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import routes from "./routes";
import { rateLimit } from "./middleware/rateLimit";
// Registers every schema with mongoose so `ref`/populate() resolve.
import "./models";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Comma-separated list of allowed origins, e.g.
//   CORS_ORIGINS=https://pitwall.app,https://www.pitwall.app
//
// Unset means development: allow anything, since the dev server's port moves
// around. In production an unset value would silently leave the API open to
// every site on the internet, so it is required there.
const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";

if (isProduction && allowedOrigins.length === 0) {
  console.error(
    "CORS_ORIGINS must be set in production — refusing to start with an open API."
  );
  process.exit(1);
}

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  })
);

app.use(express.json({ limit: "100kb" }));

// Applied to the whole API. The expensive endpoints — /race-data returns
// ~1,400 laps, /strategy fits a regression over every lap in a race — are the
// reason this exists at all.
app.use("/api", rateLimit());

app.use("/api/races", routes);

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

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(
      `   CORS: ${
        allowedOrigins.length > 0 ? allowedOrigins.join(", ") : "open (development)"
      }`
    );
  });
});
