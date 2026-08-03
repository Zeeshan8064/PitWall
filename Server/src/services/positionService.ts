import { Position } from "../models";
import { requireRaceIdBySessionKey } from "./raceLookup";

export async function getPositions(sessionKey: number) {
  const raceId = await requireRaceIdBySessionKey(sessionKey);

  const positions: any[] = await Position.find({ race: raceId })
    .populate("driver", "driverNumber")
    .sort({ date: 1 })
    .lean();

  return positions
    .filter((row) => row.driver)
    .map((row) => ({
      driverNumber: row.driver.driverNumber,
      position: row.position,
      lapNumber: row.lapNumber,
      date: row.date.toISOString(),
    }));
}
