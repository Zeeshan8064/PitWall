import { SESSION_TYPES } from "../constants";
import { fetchOpenF1 } from "../lib";
import {
  OpenF1ChampionshipDriver,
  OpenF1ChampionshipTeam,
  OpenF1Driver,
  OpenF1Interval,
  OpenF1Lap,
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

export function fetchSessions(year: number) {
  return fetchOpenF1<OpenF1Session>(`/sessions?year=${year}`);
}

export async function fetchRaceSessions(year: number) {
  const sessions = await fetchSessions(year);

  return sessions.filter(
    (session) => session.session_name === SESSION_TYPES.RACE
  );
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
