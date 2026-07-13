import { OPENF1_BASE } from "../constants";
import { fetchOpenF1 } from "../lib";
import { mapInterval } from "../mappers";
import { OpenF1Interval } from "../types";

export async function getIntervals(sessionKey: number) {
  const intervals = await fetchOpenF1<OpenF1Interval>(
    `/intervals?session_key=${sessionKey}`,
  );

  return intervals
    .filter(
      (interval) =>
        interval.interval !== null || interval.gap_to_leader !== null,
    )
    .map(mapInterval);
}
