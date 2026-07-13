import { OPENF1_BASE, REQUEST_DELAY } from "../constants/api";

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch data from OpenF1 while respecting
 * the API rate limit.
 */
export async function fetchOpenF1<T>(endpoint: string): Promise<T[]> {
  await delay(REQUEST_DELAY);

  const response = await fetch(`${OPENF1_BASE}${endpoint}`);

  if (!response.ok) {
    throw new Error(`OpenF1 request failed (${response.status})`);
  }

  return response.json() as Promise<T[]>;
}