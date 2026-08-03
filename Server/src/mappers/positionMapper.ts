import mongoose from "mongoose";
import { OpenF1Position } from "../types";

// /position is a timestamped feed with no lap number, so lapNumber is resolved
// by the caller against lap start times and may legitimately be null.
export function mapPosition(
  position: OpenF1Position,
  raceId: mongoose.Types.ObjectId,
  driverId: mongoose.Types.ObjectId,
  lapNumber: number | null = null
) {
  return {
    race: raceId,
    driver: driverId,
    lapNumber,
    position: position.position,
    date: new Date(position.date),
  };
}
