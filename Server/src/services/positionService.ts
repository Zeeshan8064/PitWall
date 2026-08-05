import { Position } from "../models";
import { getRaceContext } from "./raceLookup";

export async function getPositions(sessionKey: number) {
  const { raceId, numberByDriverId } = await getRaceContext(sessionKey);

  const positions: any[] = await Position.find({ race: raceId })
    .sort({ date: 1 })
    .lean();

  return positions
    .map((row) => ({
      driverNumber: numberByDriverId.get(String(row.driver)),
      position: row.position,
      lapNumber: row.lapNumber,
      date: row.date.toISOString(),
    }))
    .filter((row) => row.driverNumber !== undefined);
}
