import mongoose from "mongoose";
import { OpenF1Stint } from "../types";

export const TYRE_COMPOUNDS = [
  "SOFT",
  "MEDIUM",
  "HARD",
  "INTERMEDIATE",
  "WET",
] as const;

export type TyreCompound = (typeof TYRE_COMPOUNDS)[number];

// OpenF1 also emits values such as "UNKNOWN" and "TEST_UNKNOWN", which would
// fail the enum on the Stint and Lap schemas. Normalise those to null so the
// document still saves.
export function normaliseCompound(
  compound: string | null
): TyreCompound | null {
  if (!compound) return null;

  const upper = compound.toUpperCase();

  return TYRE_COMPOUNDS.includes(upper as TyreCompound)
    ? (upper as TyreCompound)
    : null;
}

export function mapStint(
  stint: OpenF1Stint,
  raceId: mongoose.Types.ObjectId,
  driverId: mongoose.Types.ObjectId
) {
  return {
    race: raceId,
    driver: driverId,
    stintNumber: stint.stint_number,
    compound: normaliseCompound(stint.compound),
    lapStart: stint.lap_start,
    lapEnd: stint.lap_end,
    tyreAgeAtStart: stint.tyre_age_at_start,
  };
}

// Builds a lap-number -> compound lookup so laps can be tagged with the tyre
// they were run on, which /laps does not tell us.
export function buildCompoundByLap(stints: OpenF1Stint[]) {
  const byLap = new Map<number, TyreCompound | null>();

  for (const stint of stints) {
    const compound = normaliseCompound(stint.compound);

    for (let lap = stint.lap_start; lap <= stint.lap_end; lap++) {
      byLap.set(lap, compound);
    }
  }

  return byLap;
}
