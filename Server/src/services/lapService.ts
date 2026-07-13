import { OPENF1_BASE } from "../constants";
import { fetchOpenF1 } from "../lib";
import { mapLap } from "../mappers";
import { OpenF1Lap } from "../types";

export async function getLaps(sessionKey: number) {
  try {
    const laps = await fetchOpenF1<OpenF1Lap>(
      `/laps?session_key=${sessionKey}`
    );

    return laps
      .filter(
        lap =>
          lap.lap_duration !== null &&
          lap.lap_duration < 150
      )
      .map(mapLap);

  } catch (error) {
    console.error("Failed to fetch laps:", error);
    throw error;
  }
}