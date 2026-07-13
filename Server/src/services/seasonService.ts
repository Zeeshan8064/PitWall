import { OPENF1_BASE, SESSION_TYPES } from "../constants";
import { fetchOpenF1 } from "../lib";
import { mapSession } from "../mappers";
import { OpenF1Session } from "../types";

export async function getSeasonRaces(year: number) {
  try {
    const sessions = await fetchOpenF1<OpenF1Session>(
      `/sessions?year=${year}`
    );

    return sessions
      .filter(session => session.session_name === SESSION_TYPES.RACE)
      .map(mapSession);

  } catch (error) {
    console.error("Failed to fetch season:", error);
    throw error;
  }
}