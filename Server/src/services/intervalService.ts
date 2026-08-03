import { Interval } from "../models";
import { requireRaceIdBySessionKey } from "./raceLookup";

export async function getIntervals(sessionKey: number) {
  const raceId = await requireRaceIdBySessionKey(sessionKey);

  const intervals: any[] = await Interval.find({
    race: raceId,
    $or: [{ interval: { $ne: null } }, { gapToLeader: { $ne: null } }],
  })
    .populate("driver", "driverNumber")
    .sort({ date: 1 })
    .lean();

  return intervals
    .filter((row) => row.driver)
    .map((row) => ({
      driverNumber: row.driver.driverNumber,
      gapToLeader: row.gapToLeader,
      interval: row.interval,
      date: row.date.toISOString(),
    }));
}
