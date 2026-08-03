import { Stint } from "../models";
import { requireRaceIdBySessionKey } from "./raceLookup";

export async function getStints(sessionKey: number) {
  const raceId = await requireRaceIdBySessionKey(sessionKey);

  const stints: any[] = await Stint.find({ race: raceId })
    .populate("driver", "driverNumber")
    .sort({ stintNumber: 1 })
    .lean();

  return stints
    .filter((stint) => stint.driver)
    .map((stint) => ({
      driverNumber: stint.driver.driverNumber,
      stintNumber: stint.stintNumber,
      lapStart: stint.lapStart,
      lapEnd: stint.lapEnd,
      compound: stint.compound,
      tyreAgeAtStart: stint.tyreAgeAtStart,
    }));
}
