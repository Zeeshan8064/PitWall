import { PitStop } from "../models";
import { getRaceContext } from "./raceLookup";

export async function getPitstops(sessionKey: number) {
  const { raceId, numberByDriverId } = await getRaceContext(sessionKey);

  const pitstops: any[] = await PitStop.find({ race: raceId })
    .sort({ lap: 1 })
    .lean();

  return pitstops
    .map((stop) => ({
      driverNumber: numberByDriverId.get(String(stop.driver)),
      lapNumber: stop.lap,
      pitDuration: stop.pitDuration,
      laneDuration: stop.laneDuration,
      stopDuration: stop.stopDuration,
      date: stop.date,
    }))
    .filter((stop) => stop.driverNumber !== undefined);
}
