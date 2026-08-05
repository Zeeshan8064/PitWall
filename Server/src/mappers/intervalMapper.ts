import mongoose from "mongoose";
import { OpenF1Interval } from "../types";

// OpenF1 samples intervals at roughly 2Hz — around 26k rows per race, of which
// the app reads 20. Keeping the last sample of each lap preserves gap-per-lap
// while cutting volume ~21x (26,147 -> 1,272 on a measured 71-lap race).
//
// Samples before the first lap starts (formation lap, grid) resolve to no lap
// and are dropped.
export function downsampleIntervals(
  intervals: OpenF1Interval[],
  resolveLap: (date: string) => number | null
) {
  const lastPerDriverLap = new Map<
    string,
    { row: OpenF1Interval; lapNumber: number }
  >();

  for (const row of intervals) {
    const lapNumber = resolveLap(row.date);
    if (lapNumber === null) continue;

    const key = `${row.driver_number}:${lapNumber}`;
    const seen = lastPerDriverLap.get(key);

    if (!seen || new Date(row.date) > new Date(seen.row.date)) {
      lastPerDriverLap.set(key, { row, lapNumber });
    }
  }

  return [...lastPerDriverLap.values()];
}

export function mapInterval(
  interval: OpenF1Interval,
  raceId: mongoose.Types.ObjectId,
  driverId: mongoose.Types.ObjectId,
  lapNumber: number | null = null
) {
  return {
    race: raceId,
    driver: driverId,
    lapNumber,
    date: new Date(interval.date),
    // Mixed on the schema: numeric seconds, or a string like "+1 LAP".
    interval: interval.interval,
    gapToLeader: interval.gap_to_leader,
  };
}
