import { Lap } from "../models";
import { requireRaceIdBySessionKey } from "./raceLookup";

export async function getLaps(sessionKey: number) {
  const raceId = await requireRaceIdBySessionKey(sessionKey);

  const laps: any[] = await Lap.find({ race: raceId })
    .populate("driver", "driverNumber")
    .sort({ lapNumber: 1 })
    .lean();

  return laps
    .filter((lap) => lap.driver)
    .map((lap) => ({
      driverNumber: lap.driver.driverNumber,
      lapNumber: lap.lapNumber,
      lapDuration: lap.lapDuration,
      isPitOutLap: lap.isPitOutLap,
      compound: lap.compound,
      sector1: lap.durationSector1,
      sector2: lap.durationSector2,
      sector3: lap.durationSector3,
    }));
}
