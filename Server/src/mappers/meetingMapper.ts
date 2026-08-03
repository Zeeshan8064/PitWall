import { OpenF1Meeting } from "../types";

// A meeting is the race weekend. It carries the official name and the circuit
// metadata that /sessions omits, so Circuit documents are fed from here.
//
// totalLaps, circuitLength and turns have no OpenF1 source and are left unset
// for a seed file to fill in.
export function mapCircuit(meeting: OpenF1Meeting) {
  return {
    circuitKey: meeting.circuit_key,
    name: meeting.circuit_short_name,
    location: meeting.location,
    country: meeting.country_name,
    circuitType: meeting.circuit_type,
  };
}

// OpenF1 has no round number. Rounds are the meetings of a season ordered by
// start date, which is stable and matches the official numbering.
//
// Pass only meetings that actually contain a race session — /meetings also
// returns pre-season testing, which would otherwise take round 1 and shift
// every real race by one.
export function assignRounds(meetings: OpenF1Meeting[]) {
  const ordered = [...meetings].sort(
    (a, b) =>
      new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  );

  return new Map(
    ordered.map((meeting, index) => [meeting.meeting_key, index + 1])
  );
}
