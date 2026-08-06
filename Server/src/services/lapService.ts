import { Lap } from "../models";
import { getRaceContext } from "./raceLookup";

export async function getLaps(sessionKey: number) {
  const { raceId, numberByDriverId } = await getRaceContext(sessionKey);

  const laps: any[] = await Lap.find({ race: raceId })
    .sort({ lapNumber: 1 })
    .lean();

  return laps
    .map((lap) => ({
      driverNumber: numberByDriverId.get(String(lap.driver)),
      lapNumber: lap.lapNumber,
      lapDuration: lap.lapDuration,
      isPitOutLap: lap.isPitOutLap,
      compound: lap.compound,
      sector1: lap.durationSector1,
      sector2: lap.durationSector2,
      sector3: lap.durationSector3,
      // Speed trap. Stored since the first ingest but never exposed — it is
      // the only straightline-speed measure in the model.
      stSpeed: lap.stSpeed ?? null,
    }))
    .filter((lap) => lap.driverNumber !== undefined);
}
