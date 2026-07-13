import { OPENF1_BASE } from "../constants";
import { fetchOpenF1 } from "../lib";
import { mapPitstop } from "../mappers";
import { OpenF1Pit } from "../types";

export async function getPitstops(sessionKey: number) {
  const pitstops = await fetchOpenF1<OpenF1Pit>(
    `/pit?session_key=${sessionKey}`
  );

  return pitstops
    .filter(pit => pit.pit_duration !== null)
    .map(mapPitstop);
}