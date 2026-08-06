import { NextFunction, Request, Response } from "express";

// Fixed-window limiter, in memory. Deliberately not a dependency: this API is
// a single process reading a database nobody can write to, so the goal is only
// to stop one client hammering the expensive endpoints — /race-data returns
// ~1,400 laps, /strategy fits a regression over every lap in a race.
//
// LIMITATION. State is per-process, so behind several instances each gets its
// own allowance. Move to a shared store if this is ever scaled horizontally.

interface Options {
  windowMs?: number;
  max?: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Sweep expired buckets so the map cannot grow without bound. unref() keeps
// this timer from holding the process open on shutdown.
const SWEEP_INTERVAL_MS = 60_000;

setInterval(() => {
  const now = Date.now();

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, SWEEP_INTERVAL_MS).unref();

export function rateLimit(options: Options = {}) {
  const windowMs = options.windowMs ?? Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
  const max = options.max ?? Number(process.env.RATE_LIMIT_MAX ?? 120);

  return (req: Request, res: Response, next: NextFunction) => {
    // Behind a proxy Express reports the proxy's address unless `trust proxy`
    // is set, so prefer the forwarded header when present.
    const forwarded = req.headers["x-forwarded-for"];
    const key =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0].trim() ||
      req.ip ||
      "unknown";

    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Remaining", max - 1);
      return next();
    }

    bucket.count++;

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);

      res.setHeader("Retry-After", retryAfter);
      res.setHeader("X-RateLimit-Remaining", 0);

      return res.status(429).json({
        success: false,
        message: `Too many requests. Retry in ${retryAfter}s.`,
      });
    }

    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - bucket.count));
    next();
  };
}
