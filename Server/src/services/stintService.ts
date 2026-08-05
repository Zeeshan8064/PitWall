import { Stint } from "../models";
import { getRaceContext } from "./raceLookup";

export async function getStints(sessionKey: number) {
  const { raceId, numberByDriverId } = await getRaceContext(sessionKey);

  const stints: any[] = await Stint.find({ race: raceId })
    .sort({ stintNumber: 1 })
    .lean();

  return stints
    .map((stint) => ({
      driverNumber: numberByDriverId.get(String(stint.driver)),
      stintNumber: stint.stintNumber,
      lapStart: stint.lapStart,
      lapEnd: stint.lapEnd,
      compound: stint.compound,
      tyreAgeAtStart: stint.tyreAgeAtStart,
    }))
    .filter((stint) => stint.driverNumber !== undefined);
}
