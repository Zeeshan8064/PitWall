import { fetchOpenF1 } from "../lib";
import { mapPosition } from "../mappers";
import { OpenF1Position } from "../types";

export async function getPositions(sessionKey: number) {
  const positions = await fetchOpenF1<OpenF1Position>(
    `/position?session_key=${sessionKey}`
  );

  return positions.map(mapPosition);
}