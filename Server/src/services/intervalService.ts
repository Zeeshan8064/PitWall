import { Interval } from "../models";
import { getRaceContext } from "./raceLookup";

// One row per driver per lap — see the downsampling note in ingestService.
export async function getIntervals(sessionKey: number) {
  const { raceId, numberByDriverId } = await getRaceContext(sessionKey);

  const intervals: any[] = await Interval.find({
    race: raceId,
    $or: [{ interval: { $ne: null } }, { gapToLeader: { $ne: null } }],
  })
    .sort({ lapNumber: 1 })
    .lean();

  return intervals
    .map((row) => ({
      driverNumber: numberByDriverId.get(String(row.driver)),
      lapNumber: row.lapNumber,
      gapToLeader: row.gapToLeader,
      interval: row.interval,
      date: row.date.toISOString(),
    }))
    .filter((row) => row.driverNumber !== undefined);
}
