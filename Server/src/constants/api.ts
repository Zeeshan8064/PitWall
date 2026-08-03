export const OPENF1_BASE = "https://api.openf1.org/v1";

// OpenF1 publishes two caps that apply simultaneously:
//   "Up to 3 requests per second and 30 requests per minute"
//
// The per-minute cap is the binding one — it works out to one request every
// 2s sustained, so a fixed per-request delay cannot satisfy both without
// being needlessly slow in bursts. See lib/rateLimiter.
export const RATE_LIMIT = {
  perSecond: 3,
  perMinute: 30,
  secondWindowMs: 1_000,
  minuteWindowMs: 60_000,
} as const;

// Position and lap payloads for a full race are large, so this is generous.
export const REQUEST_TIMEOUT = 30_000;

// A 429 means our own accounting drifted from the server's. Back off and retry
// rather than failing a whole ingest.
export const RATE_LIMIT_RETRIES = 3;
export const RATE_LIMIT_BACKOFF_MS = 5_000;
