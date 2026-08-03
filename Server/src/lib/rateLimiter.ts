import { RATE_LIMIT } from "../constants/api";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Timestamps of requests already let through, newest last. Only the last
// minute matters, so the list stays small.
let history: number[] = [];

// Acquisition is serialised through this chain. Without it, concurrent callers
// (the Promise.all in ingestService, say) would each read `history` before any
// of them wrote to it and all decide they were clear to go.
let queue: Promise<void> = Promise.resolve();

// How long to wait before a request may go out, given the two sliding windows.
function waitTime(now: number) {
  history = history.filter((at) => now - at < RATE_LIMIT.minuteWindowMs);

  const inSecond = history.filter((at) => now - at < RATE_LIMIT.secondWindowMs);

  let wait = 0;

  // If the window is full, we may go once its oldest relevant entry expires.
  if (inSecond.length >= RATE_LIMIT.perSecond) {
    const oldest = inSecond[inSecond.length - RATE_LIMIT.perSecond];
    wait = Math.max(wait, oldest + RATE_LIMIT.secondWindowMs - now);
  }

  if (history.length >= RATE_LIMIT.perMinute) {
    const oldest = history[history.length - RATE_LIMIT.perMinute];
    wait = Math.max(wait, oldest + RATE_LIMIT.minuteWindowMs - now);
  }

  return wait;
}

// Resolves when the caller is clear to send one request.
export function acquireSlot(): Promise<void> {
  const slot = queue.then(async () => {
    // Re-check after each sleep: waiting for the per-second window can push us
    // into a state where the per-minute window is now the constraint.
    let wait = waitTime(Date.now());

    while (wait > 0) {
      await delay(wait);
      wait = waitTime(Date.now());
    }

    history.push(Date.now());
  });

  // A rejected link must not break the chain for everyone behind it.
  queue = slot.catch(() => undefined);

  return slot;
}

// After a 429 the server disagrees with our accounting, so drop our budget for
// the current minute and let the windows refill from scratch.
export function penaliseRateLimit() {
  const now = Date.now();

  history = Array.from({ length: RATE_LIMIT.perMinute }, () => now);
}
