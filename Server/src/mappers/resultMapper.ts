import mongoose from "mongoose";
import { OpenF1SessionResult } from "../types";
import { TyreCompound } from "./stintMapper";

export const RACE_RESULT_STATUSES = [
  "FINISHED",
  "DNF",
  "DNS",
  "DSQ",
] as const;

export type RaceResultStatus = (typeof RACE_RESULT_STATUSES)[number];

function resolveStatus(result: OpenF1SessionResult): RaceResultStatus {
  if (result.dsq) return "DSQ";
  if (result.dns) return "DNS";
  if (result.dnf) return "DNF";
  return "FINISHED";
}

// /session_result supplies points and retirement flags directly, so none of it
// needs deriving. `gridPosition` and `finalCompound` are not in the payload —
// grid comes from the earliest position sample, compound from the last stint.
export function mapRaceResult(
  result: OpenF1SessionResult,
  raceId: mongoose.Types.ObjectId,
  driverId: mongoose.Types.ObjectId,
  extras: {
    gridPosition?: number | null;
    finalCompound?: TyreCompound | null;
  } = {}
) {
  return {
    race: raceId,
    driver: driverId,
    gridPosition: extras.gridPosition ?? null,
    finishPosition: result.position,
    points: result.points ?? 0,
    numberOfLaps: result.number_of_laps,
    status: resolveStatus(result),
    // Mixed on the schema: numeric seconds, or a string like "+1 LAP".
    gapToLeader: result.gap_to_leader,
    // Usually total race seconds, but OpenF1 returns an array of per-part
    // durations for multi-part sessions such as qualifying.
    finishTime: Array.isArray(result.duration) ? null : result.duration,
    finalCompound: extras.finalCompound ?? null,
  };
}
