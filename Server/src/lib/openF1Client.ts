import {
  OPENF1_BASE,
  RATE_LIMIT_BACKOFF_CAP_MS,
  RATE_LIMIT_BACKOFF_MS,
  RATE_LIMIT_RETRIES,
  REQUEST_TIMEOUT,
} from "../constants/api";
import { acquireSlot, penaliseRateLimit } from "./rateLimiter";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// OpenF1 intermittently answers 502/503/504 under load. Those are transient
// and worth retrying — unlike a 4xx, which will fail identically forever.
const RETRYABLE_SERVER_ERRORS = [500, 502, 503, 504];

type RequestOutcome<T> =
  | { status: "ok"; rows: T[] }
  | { status: "rate_limited" }
  | { status: "server_error"; code: number };

async function requestOnce<T>(endpoint: string): Promise<RequestOutcome<T>> {
  // Blocks until both the per-second and per-minute budgets allow a request.
  await acquireSlot();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${OPENF1_BASE}${endpoint}`, {
      signal: controller.signal,
    });

    if (response.status === 429) {
      penaliseRateLimit();
      return { status: "rate_limited" };
    }

    if (RETRYABLE_SERVER_ERRORS.includes(response.status)) {
      return { status: "server_error", code: response.status };
    }

    // OpenF1 answers 404 for "this endpoint has nothing for that session"
    // rather than returning an empty list — /intervals does it for every
    // qualifying session, for instance. Treating it as fatal would abort the
    // whole session's ingest over data that legitimately does not exist.
    if (response.status === 404) {
      console.warn(`OpenF1 has no data for ${endpoint} — treating as empty`);
      return { status: "ok", rows: [] };
    }

    if (!response.ok) {
      throw new Error(`OpenF1 request failed (${response.status}): ${endpoint}`);
    }

    return { status: "ok", rows: (await response.json()) as T[] };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `OpenF1 request timed out after ${REQUEST_TIMEOUT}ms: ${endpoint}`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchOpenF1<T>(endpoint: string): Promise<T[]> {
  let lastServerError = 0;

  for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt++) {
    const result = await requestOnce<T>(endpoint);

    if (result.status === "ok") {
      return result.rows;
    }

    if (result.status === "server_error") {
      lastServerError = result.code;

      if (attempt < RATE_LIMIT_RETRIES) {
        // Same exponential curve as a rate limit, but no limiter penalty —
        // a 502 says the server is struggling, not that we asked too often.
        const backoff = Math.round(
          Math.min(RATE_LIMIT_BACKOFF_MS * 2 ** attempt, RATE_LIMIT_BACKOFF_CAP_MS) *
            (0.5 + Math.random() * 0.5)
        );

        console.warn(
          `OpenF1 returned ${result.code} (attempt ${attempt + 1}/${RATE_LIMIT_RETRIES}), ` +
            `retrying in ${backoff}ms: ${endpoint}`
        );

        await delay(backoff);
      }

      continue;
    }

    if (attempt < RATE_LIMIT_RETRIES) {
      // Exponential, capped, with jitter so a batch that was limited together
      // does not come back in lockstep and trip the limit again.
      const exponential = Math.min(
        RATE_LIMIT_BACKOFF_MS * 2 ** attempt,
        RATE_LIMIT_BACKOFF_CAP_MS
      );
      const backoff = Math.round(exponential * (0.5 + Math.random() * 0.5));

      // The cooldown from penaliseRateLimit dominates this, so say so — the
      // old message promised a 5s retry and then sat in the limiter for a
      // further ~55s, which read as a hang.
      console.warn(
        `Rate limited by OpenF1 (attempt ${attempt + 1}/${RATE_LIMIT_RETRIES}), ` +
          `backing off ${backoff}ms then waiting for the rate limiter to clear ` +
          `(up to ~60s): ${endpoint}`
      );

      await delay(backoff);
    }
  }

  throw new Error(
    lastServerError
      ? `OpenF1 kept returning ${lastServerError} after ${RATE_LIMIT_RETRIES} retries: ${endpoint}`
      : `OpenF1 rate limit not cleared after ${RATE_LIMIT_RETRIES} retries: ${endpoint}`
  );
}
