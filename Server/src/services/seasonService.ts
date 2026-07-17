import { OPENF1_BASE, SESSION_TYPES } from "../constants";
import { fetchOpenF1 } from "../lib";
import { mapSession } from "../mappers";
import { OpenF1Session } from "../types";

export async function getSeasonRaces(year: number) {
  try {
    const sessions = await fetchOpenF1<OpenF1Session>(
      `/sessions?year=${year}`
    );
    console.log("Sessions fetched:", sessions.length);
console.log("First session:", sessions[0]);
console.log("Session names:", [...new Set(sessions.map(s => s.session_name))]);

    return sessions
      .filter(session => session.session_name === SESSION_TYPES.RACE)
      .map(mapSession);

  } catch (error) {
    console.error("Failed to fetch season:", error);
    throw error;
  }
}