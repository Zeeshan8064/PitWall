import mongoose from "mongoose";
import { OpenF1Lap } from "../types";
import { TyreCompound } from "./stintMapper";

// `compound` and `position` are not part of the /laps payload — the caller
// resolves them from stint lap ranges and the position feed respectively.
export function mapLap(
  lap: OpenF1Lap,
  raceId: mongoose.Types.ObjectId,
  driverId: mongoose.Types.ObjectId,
  extras: { compound?: TyreCompound | null; position?: number | null } = {}
) {
  return {
    race: raceId,
    driver: driverId,
    lapNumber: lap.lap_number,
    lapDuration: lap.lap_duration,
    compound: extras.compound ?? null,
    stSpeed: lap.st_speed,
    durationSector1: lap.duration_sector_1,
    durationSector2: lap.duration_sector_2,
    durationSector3: lap.duration_sector_3,
    position: extras.position ?? null,
    isPitOutLap: lap.is_pit_out_lap,
    dateStart: lap.date_start ? new Date(lap.date_start) : null,
  };
}
