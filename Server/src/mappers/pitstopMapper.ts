import mongoose from "mongoose";
import { OpenF1Pit } from "../types";

export function mapPitstop(
  pitstop: OpenF1Pit,
  raceId: mongoose.Types.ObjectId,
  driverId: mongoose.Types.ObjectId
) {
  return {
    race: raceId,
    driver: driverId,
    lap: pitstop.lap_number,
    date: new Date(pitstop.date),
    laneDuration: pitstop.lane_duration,
    pitDuration: pitstop.pit_duration,
    stopDuration: pitstop.stop_duration,
  };
}
