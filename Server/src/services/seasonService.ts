import { RACE_SESSION_FILTER } from "../constants";
import { Race } from "../models";

// Reads the ingested season rather than calling OpenF1. Response shape is
// unchanged from the old live-fetch implementation apart from meetingKey.
//
// The races collection now holds every session of a weekend, so this must
// filter to race sessions or a season would come back with four entries per
// round.
export async function getSeasonRaces(year: number) {
  const races: any[] = await Race.find({
    season: year,
    ...RACE_SESSION_FILTER,
  })
    .populate("circuit")
    .sort({ round: 1 })
    .lean();

  return races.map((race) => ({
    sessionKey: race.sessionKey,
    // The weekend this race belongs to — the key the session selector needs.
    meetingKey: race.meetingKey,
    round: race.round,
    raceName: race.meetingName,
    officialName: race.officialName,
    circuit: race.circuit?.name ?? null,
    location: race.circuit?.location ?? null,
    country: race.circuit?.country ?? null,
    // Null until the circuit has been traced; the client falls back to a
    // decorative shape in that case.
    circuitOutline: race.circuit?.outlinePath ?? null,
    date: race.startDate,
    year: race.season,
  }));
}

// The drivers list is not season-scoped in the model, but callers still ask
// for "the season's driver session". Resolve it to the first ingested race.
export async function getSeasonDriverSession(year: number) {
  const race: any = await Race.findOne(
    { season: year, ...RACE_SESSION_FILTER },
    { sessionKey: 1 }
  )
    .sort({ round: 1 })
    .lean();

  if (!race) {
    throw new Error(`No ingested race sessions found for ${year}`);
  }

  return race.sessionKey as number;
}
