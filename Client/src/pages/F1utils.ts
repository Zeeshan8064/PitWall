// Shared helpers used across the Race Replay list and Race detail pages.

// The API's `country_code` field from OpenF1 is frequently empty, so we
// fall back to mapping the full country name to an ISO code ourselves.
export const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  Australia: "AU",
  China: "CN",
  Japan: "JP",
  Bahrain: "BH",
  "Saudi Arabia": "SA",
  "United States": "US",
  Canada: "CA",
  Monaco: "MC",
  Spain: "ES",
  Austria: "AT",
  "United Kingdom": "GB",
  "Great Britain": "GB",
  Belgium: "BE",
  Hungary: "HU",
  Netherlands: "NL",
  Italy: "IT",
  Azerbaijan: "AZ",
  Singapore: "SG",
  Mexico: "MX",
  Brazil: "BR",
  "United Arab Emirates": "AE",
  Qatar: "QA",
  Germany: "DE",
  France: "FR",
  Portugal: "PT",
};

// Resolves the best available ISO country code so we can load a real
// flag image (flagcdn.com) instead of relying on emoji flags — many
// Windows/Chrome setups render flag emoji as plain two-letter text
// instead of an actual flag icon.
export function getCountryIso(countryCode?: string | null, country?: string | null) {
  if (countryCode && countryCode.length === 2) return countryCode.toLowerCase();
  const derived = country ? COUNTRY_NAME_TO_ISO[country] : undefined;
  return derived ? derived.toLowerCase() : null;
}

// "2026-03-08T04:00:00+00:00" -> "08 MAR"
export function formatDateShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
    .toUpperCase();
}

// "2026-03-08T04:00:00+00:00" -> "8 March 2026"
export function formatDateFull(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// 79.842 (seconds) -> "1:19.842"
export function formatLapTime(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) {
    return "—";
  }
  const minutes = Math.floor(seconds / 60);
  const rest = (seconds - minutes * 60).toFixed(3).padStart(6, "0");
  return `${minutes}:${rest}`;
}

// Tyre compound -> badge color, matching real F1 tyre color conventions.
export const COMPOUND_STYLES: Record<string, string> = {
  SOFT: "bg-red-500/15 text-red-400 border-red-500/30",
  MEDIUM: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  HARD: "bg-neutral-300/15 text-neutral-200 border-neutral-400/30",
  INTERMEDIATE: "bg-green-500/15 text-green-400 border-green-500/30",
  WET: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

// Decorative, non-literal track-outline doodles — a handful of winding
// closed loops used across cards and race pages so each feels distinct.
// These are stylized shapes, not traced from real circuit maps.
export const TRACK_SHAPES = [
  "M20 55 C15 35 25 20 45 18 C60 16 65 25 58 32 C50 40 65 42 78 35 C95 26 110 32 108 45 C106 58 90 60 75 55 C60 50 40 62 30 58 C24 56 22 58 20 55 Z",
  "M15 30 C15 18 30 15 45 20 C55 24 50 32 60 34 C75 37 70 20 90 18 C108 16 112 30 100 38 C88 46 100 52 95 60 C88 68 70 62 60 55 C48 47 30 55 20 48 C12 43 15 36 15 30 Z",
  "M25 20 C40 12 55 18 52 28 C50 35 62 30 72 22 C88 10 105 20 100 35 C96 48 108 50 105 60 C100 70 82 65 70 58 C58 51 45 60 32 55 C18 50 12 40 18 32 C22 26 22 24 25 20 Z",
  "M18 45 C10 32 22 18 38 22 C48 25 44 35 52 36 C68 38 62 18 82 16 C100 14 108 28 98 38 C90 46 102 50 96 60 C90 68 74 64 65 56 C55 48 42 58 30 54 C20 50 22 50 18 45 Z",
  "M30 15 C48 10 58 22 50 30 C44 36 56 38 68 32 C85 24 105 28 102 42 C100 52 112 55 105 64 C96 72 78 66 68 58 C58 50 44 60 30 56 C16 52 12 40 18 32 C22 26 24 18 30 15 Z",
];

// Deterministic pick from TRACK_SHAPES based on a seed (e.g. sessionKey
// or list index), so the same race always shows the same doodle instead
// of it changing on every render/visit.
export function getTrackShape(seed: number | string) {
  const n =
    typeof seed === "number"
      ? seed
      : seed.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return TRACK_SHAPES[Math.abs(n) % TRACK_SHAPES.length];
}

// Sector times are always under a minute in practice — plain seconds
// reads better here than the mm:ss lap-time format.
export function formatSectorTime(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) {
    return "—";
  }
  return `${seconds.toFixed(3)}s`;
}

export function formatPitDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) {
    return "—";
  }
  return `${seconds.toFixed(3)}s`;
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export function formatPosition(pos: number | null | undefined) {
  if (pos === null || pos === undefined) return "—";
  return `P${pos}`;
}

export function formatOrdinal(pos: number | null | undefined) {
  if (pos === null || pos === undefined) return "—";
  return ordinal(pos);
}

// OpenF1's gap_to_leader is usually a number of seconds, but for lapped
// cars it can be a string like "+1 LAP" instead. Handle both.
export function formatGap(gap: number | string | null | undefined) {
  if (gap === null || gap === undefined) return "—";
  if (typeof gap === "number") return `+${gap.toFixed(3)}s`;
  return gap;
}