import { normaliseSessionType, SESSION_TYPES } from "../constants";
import { fetchOpenF1 } from "../lib";
import {
  OpenF1ChampionshipDriver,
  OpenF1ChampionshipTeam,
  OpenF1Driver,
  OpenF1Interval,
  OpenF1Lap,
  OpenF1Location,
  OpenF1Meeting,
  OpenF1Pit,
  OpenF1Position,
  OpenF1Session,
  OpenF1SessionResult,
  OpenF1Stint,
} from "../types";

// Raw OpenF1 access. These return the API's own shapes untouched — mapping to
// model documents happens in ingestService, so nothing is dropped in transit.
//
// This is the only place that talks to OpenF1. Once a season is ingested it
// sits outside the request path entirely.

export function fetchMeetings(year: number) {
  return fetchOpenF1<OpenF1Meeting>(`/meetings?year=${year}`);
}

// The season's whole session list, fetched once per ingest and filtered by the
// caller. Deliberately not wrapped in per-session-type helpers: each helper
// would call this again, and asking for the same payload twice was how the
// ingest ended up making a redundant round trip.
//
// Callers must exclude cancelled sessions. Those keep a session_key but 404 on
// every data endpoint, and would be stored as empty rows holding a round
// number. 2026 Bahrain and Jeddah, and 2023 Imola, are the known cases.
export function fetchSessions(year: number) {
  return fetchOpenF1<OpenF1Session>(`/sessions?year=${year}`);
}

export function fetchDrivers(sessionKey: number) {
  return fetchOpenF1<OpenF1Driver>(`/drivers?session_key=${sessionKey}`);
}

export function fetchLaps(sessionKey: number) {
  return fetchOpenF1<OpenF1Lap>(`/laps?session_key=${sessionKey}`);
}

export function fetchStints(sessionKey: number) {
  return fetchOpenF1<OpenF1Stint>(`/stints?session_key=${sessionKey}`);
}

export function fetchPitstops(sessionKey: number) {
  return fetchOpenF1<OpenF1Pit>(`/pit?session_key=${sessionKey}`);
}

export function fetchIntervals(sessionKey: number) {
  return fetchOpenF1<OpenF1Interval>(`/intervals?session_key=${sessionKey}`);
}

export function fetchPositions(sessionKey: number) {
  return fetchOpenF1<OpenF1Position>(`/position?session_key=${sessionKey}`);
}

// Position samples for one driver over one time window. Always bounded by a
// date range — an unbounded /location call for a session returns millions of
// rows. Used only to trace a circuit outline, and never stored.
export function fetchLocation(
  sessionKey: number,
  driverNumber: number,
  from: Date,
  to: Date
) {
  // OpenF1 wants naive ISO timestamps, without the milliseconds or zone.
  const stamp = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, "");

  return fetchOpenF1<OpenF1Location>(
    `/location?session_key=${sessionKey}&driver_number=${driverNumber}` +
      `&date>=${stamp(from)}&date<=${stamp(to)}`
  );
}

export function fetchSessionResults(sessionKey: number) {
  return fetchOpenF1<OpenF1SessionResult>(
    `/session_result?session_key=${sessionKey}`
  );
}

export function fetchDriverChampionship(sessionKey: number) {
  return fetchOpenF1<OpenF1ChampionshipDriver>(
    `/championship_drivers?session_key=${sessionKey}`
  );
}

export function fetchTeamChampionship(sessionKey: number) {
  return fetchOpenF1<OpenF1ChampionshipTeam>(
    `/championship_teams?session_key=${sessionKey}`
  );
}
