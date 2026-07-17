import { OPENF1_BASE, REQUEST_DELAY, REQUEST_TIMEOUT } from "../constants/api";

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch data from OpenF1 while respecting the API rate limit,
 * and enforcing a hard timeout so a slow/hanging OpenF1 request
 * can never hang the whole Express response indefinitely.
 */
export async function fetchOpenF1<T>(endpoint: string): Promise<T[]> {
  await delay(REQUEST_DELAY);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${OPENF1_BASE}${endpoint}`, {
      signal: controller.signal,
    });

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