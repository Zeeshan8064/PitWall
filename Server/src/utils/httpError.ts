// Messages the services throw deliberately, and which are safe and useful to
// show a client: they describe a missing resource, not an internal failure.
//
// Anything else — a mongoose error, a driver timeout, a TypeError — carries
// file paths, query shapes and stack context, so it is replaced with a generic
// message and logged server-side instead.
const SAFE_PATTERNS = [
  /has not been ingested/i,
  /no lap data/i,
  /only applies to race sessions/i,
  /^no team matching/i,
  /^no ingested race sessions/i,
];

export interface ClientError {
  status: number;
  message: string;
}

export function describeError(error: unknown, fallback: string): ClientError {
  const raw = error instanceof Error ? error.message : "";

  const isKnown = SAFE_PATTERNS.some((pattern) => pattern.test(raw));

  // A known message means the caller asked for something that is not there,
  // which is a 404 rather than a server fault.
  return isKnown
    ? { status: 404, message: raw }
    : { status: 500, message: fallback };
}
