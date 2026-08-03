import mongoose from "mongoose";
import { OpenF1Interval } from "../types";

export function mapInterval(
  interval: OpenF1Interval,
  raceId: mongoose.Types.ObjectId,
  driverId: mongoose.Types.ObjectId
) {
  return {
    race: raceId,
    driver: driverId,
    date: new Date(interval.date),
    // Mixed on the schema: numeric seconds, or a string like "+1 LAP".
    interval: interval.interval,
    gapToLeader: interval.gap_to_leader,
  };
}
