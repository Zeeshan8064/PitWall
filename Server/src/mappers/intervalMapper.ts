import {OpenF1Interval} from "../types"

export function mapInterval(interval: OpenF1Interval) {
  return {
    driverNumber: interval.driver_number,
    gapToLeader: interval.gap_to_leader,
    interval: interval.interval,
    date:interval.date,
  };
}