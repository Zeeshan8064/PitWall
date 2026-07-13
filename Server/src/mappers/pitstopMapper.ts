import { OpenF1Pit } from "../types";

export function mapPitstop(pitstop: OpenF1Pit) {
  return {
    driverNumber:pitstop.driver_number,
    lapNumber:pitstop.lap_number,
    pitDuration:pitstop.pit_duration
  };
}