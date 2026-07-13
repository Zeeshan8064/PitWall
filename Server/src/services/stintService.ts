import { OPENF1_BASE } from "../constants";
import { fetchOpenF1 } from "../lib";
import { mapStint } from "../mappers";
import { OpenF1Stint } from "../types";

export async function getStints(sessionKey: number) {
  const stints = await fetchOpenF1<OpenF1Stint>(
    `/stints?session_key=${sessionKey}`
  );

  return stints.map(mapStint);
}