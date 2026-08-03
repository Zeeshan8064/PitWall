import { PitStop } from "../models";
import { requireRaceIdBySessionKey } from "./raceLookup";

export async function getPitstops(sessionKey: number) {
  const raceId = await requireRaceIdBySessionKey(sessionKey);

  const pitstops: any[] = await PitStop.find({ race: raceId })
    .populate("driver", "driverNumber")
    .sort({ lap: 1 })
    .lean();

  return pitstops
    .filter((stop) => stop.driver)
    .map((stop) => ({
      driverNumber: stop.driver.driverNumber,
      lapNumber: stop.lap,
      pitDuration: stop.pitDuration,
      laneDuration: stop.laneDuration,
      stopDuration: stop.stopDuration,
      date: stop.date,
    }));
}
