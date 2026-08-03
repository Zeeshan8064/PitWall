import {
  OPENF1_BASE,
  RATE_LIMIT_BACKOFF_MS,
  RATE_LIMIT_RETRIES,
  REQUEST_TIMEOUT,
} from "../constants/api";
import { acquireSlot, penaliseRateLimit } from "./rateLimiter";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestOnce<T>(endpoint: string): Promise<T[] | "RATE_LIMITED"> {
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
      return "RATE_LIMITED";
    }

    if (!response.ok) {
      throw new Error(`OpenF1 request failed (${response.status}): ${endpoint}`);
    }

    return (await response.json()) as T[];
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
  for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt++) {
    const result = await requestOnce<T>(endpoint);

    if (result !== "RATE_LIMITED") {
      return result;
    }

    if (attempt < RATE_LIMIT_RETRIES) {
      const backoff = RATE_LIMIT_BACKOFF_MS * (attempt + 1);
      console.warn(
        `Rate limited by OpenF1, retrying in ${backoff}ms: ${endpoint}`
      );
      await delay(backoff);
    }
  }

  throw new Error(
    `OpenF1 rate limit not cleared after ${RATE_LIMIT_RETRIES} retries: ${endpoint}`
  );
}
