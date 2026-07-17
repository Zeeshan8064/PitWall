import { OpenF1Lap } from "../types";

export function mapLap(lap: OpenF1Lap) {
  return {
    driverNumber: lap.driver_number,
    lapNumber: lap.lap_number,
    lapDuration: lap.lap_duration,
    isPitOutLap: lap.is_pit_out_lap,
    sector1: lap.duration_sector_1,
    sector2: lap.duration_sector_2,
    sector3: lap.duration_sector_3,
  };
}