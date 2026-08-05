import { OpenF1Lap } from "../types";

// Several OpenF1 feeds (/position, /intervals) are timestamped but carry no
// lap number. A sample belongs to the last lap that had started at or before
// its timestamp.
export function buildLapResolver(laps: OpenF1Lap[]) {
  const starts = laps
    .filter((lap) => lap.date_start !== null)
    .map((lap) => ({
      lapNumber: lap.lap_number,
      at: new Date(lap.date_start as string).getTime(),
    }))
    .sort((a, b) => a.at - b.at);

  return (date: string): number | null => {
    const at = new Date(date).getTime();

    let resolved: number | null = null;

    for (const start of starts) {
      if (start.at > at) break;
      resolved = start.lapNumber;
    }

    return resolved;
  };
}
