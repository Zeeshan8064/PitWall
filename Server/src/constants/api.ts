export const OPENF1_BASE = "https://api.openf1.org/v1";

// OpenF1 publishes two caps that apply simultaneously:
//   "Up to 3 requests per second and 30 requests per minute"
//
// The per-minute cap is the binding one — it works out to one request every
// 2s sustained, so a fixed per-request delay cannot satisfy both without
// being needlessly slow in bursts. See lib/rateLimiter.
// Held under the published caps deliberately. Running at exactly the limit
// leaves no room for our clock and the server's to disagree, and a single 429
// costs a full minute of cooldown — far more than the headroom saves.
export const RATE_LIMIT = {
  perSecond: 2,
  perMinute: 25,
  secondWindowMs: 1_000,
  minuteWindowMs: 60_000,
} as const;

// The important one. Without a floor between requests the sliding windows let
// the whole minute's budget go out in a ~10s burst and then idle ~50s. Same
// throughput, far more likely to trip a server-side limiter. Pacing evenly at
// just over 60s/perMinute keeps the request stream smooth.
export const MIN_REQUEST_GAP_MS = 2_500;

// Position and lap payloads for a full race are large, so this is generous.
export const REQUEST_TIMEOUT = 30_000;

// A 429 means our own accounting drifted from the server's. Back off and retry
// rather than failing a whole ingest. Backoff is exponential with jitter, so
// requests that were rate limited together do not all return at the same
// instant and trip the limit again.
export const RATE_LIMIT_RETRIES = 5;
export const RATE_LIMIT_BACKOFF_MS = 2_000;
export const RATE_LIMIT_BACKOFF_CAP_MS = 60_000;

// Ignore repeat 429s inside this window — six concurrent requests failing
// together describe one event, not six.
export const RATE_LIMIT_PENALTY_COOLDOWN_MS = 5_000;
