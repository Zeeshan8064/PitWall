import { OpenF1Stint } from "../types";

export function mapStint(stint: OpenF1Stint) {
  return {
    driverNumber: stint.driver_number,
    stintNumber: stint.stint_number,
    lapStart: stint.lap_start,
    lapEnd: stint.lap_end,
    compound: stint.compound,
    tyreAgeAtStart: stint.tyre_age_at_start
  };
}