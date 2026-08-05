import mongoose from "mongoose";

import { RACE_SESSION_FILTER } from "../constants";
import {
  ConstructorsChampionship,
  DriverChampionship,
  DriverEntry,
  Race,
} from "../models";

// Standings are stored per race, not per season — one document per driver (or
// team) per round. "The season's standings" therefore means "the standings
// after the latest round that has championship data", which is what
// resolveSeasonRace works out below.

interface RaceRef {
  _id: mongoose.Types.ObjectId;
  round: number;
  sessionKey: number;
  meetingName: string;
}

// The championship endpoints are beta and race-sessions-only, so the latest
// ingested round is not necessarily the latest round *with* standings. Ask the
// standings collection which rounds it actually has rather than assuming.
// `model` is either standings collection. Typed loosely because the two model
// types form a union mongoose cannot call through.
async function resolveSeasonRace(
  model: mongoose.Model<any>,
  season: number
): Promise<RaceRef | null> {
  const races: any[] = await Race.find(
    { season, ...RACE_SESSION_FILTER },
    { _id: 1, round: 1, sessionKey: 1, meetingName: 1 }
  )
    .sort({ round: 1 })
    .lean();

  if (races.length === 0) {
    return null;
  }

  const withData: mongoose.Types.ObjectId[] = await model.distinct("race", {
    race: { $in: races.map((race) => race._id) },
  });

  const withDataIds = new Set(withData.map(String));

  // Walk backwards: the last round holding standings is the current one.
  for (let i = races.length - 1; i >= 0; i--) {
    if (withDataIds.has(String(races[i]._id))) {
      return races[i] as RaceRef;
    }
  }

  return null;
}

async function requireRace(sessionKey: number): Promise<RaceRef> {
  const race: any = await Race.findOne(
    { sessionKey },
    { _id: 1, round: 1, sessionKey: 1, meetingName: 1, season: 1 }
  ).lean();

  if (!race) {
    throw new Error(
      `Session ${sessionKey} has not been ingested. Run the season ingest first.`
    );
  }

  return race as RaceRef;
}

// Car numbers and team colours live on DriverEntry, not Driver, so standings
// need the season's entries to render a row.
async function getEntryLookup(season: number) {
  const entries: any[] = await DriverEntry.find(
    { season },
    { driver: 1, driverNumber: 1, team: 1 }
  )
    .populate("team")
    .lean();

  return new Map<string, any>(entries.map((e) => [String(e.driver), e]));
}

async function seasonOf(raceId: mongoose.Types.ObjectId): Promise<number> {
  const race: any = await Race.findById(raceId, { season: 1 }).lean();

  return race?.season;
}

function movement(entry: any) {
  return {
    points: entry.pointsCurrent,
    pointsGained: entry.pointsCurrent - entry.pointsStart,
    position: entry.positionCurrent,
    // Positive means places gained over the round — positionStart is the
    // standing going into it.
    positionChange: entry.positionStart - entry.positionCurrent,
  };
}

// ─── Drivers ────────────────────────────────────────────────────────────────

async function serialiseDriverStandings(race: RaceRef) {
  const season = await seasonOf(race._id);
  const entryByDriverId = await getEntryLookup(season);

  const standings: any[] = await DriverChampionship.find({ race: race._id })
    .populate("driver")
    .sort({ positionCurrent: 1 })
    .lean();

  return {
    season,
    round: race.round,
    sessionKey: race.sessionKey,
    raceName: race.meetingName,
    standings: standings
      .filter((entry) => entry.driver)
      .map((entry) => {
        const seat = entryByDriverId.get(String(entry.driver._id));

        return {
          driverNumber: seat?.driverNumber ?? null,
          firstName: entry.driver.firstName,
          lastName: entry.driver.lastName,
          fullName:
            entry.driver.fullName ??
            `${entry.driver.firstName} ${entry.driver.lastName}`.trim(),
          acronym: entry.driver.acronym,
          countryCode: entry.driver.nationality ?? null,
          team: seat?.team?.name ?? null,
          teamColour: seat?.team?.color ?? "#666666",
          ...movement(entry),
        };
      }),
  };
}

// Standings as they stand after the season's latest round with data.
export async function getDriverChampionship(season: number) {
  const race = await resolveSeasonRace(DriverChampionship, season);

  if (!race) {
    return { season, round: null, sessionKey: null, raceName: null, standings: [] };
  }

  return serialiseDriverStandings(race);
}

// Standings as they stood after one specific race.
export async function getDriverChampionshipAtRace(sessionKey: number) {
  return serialiseDriverStandings(await requireRace(sessionKey));
}

// ─── Constructors ───────────────────────────────────────────────────────────

async function serialiseConstructorStandings(race: RaceRef) {
  const season = await seasonOf(race._id);

  const standings: any[] = await ConstructorsChampionship.find({
    race: race._id,
  })
    .populate("team")
    .sort({ positionCurrent: 1 })
    .lean();

  return {
    season,
    round: race.round,
    sessionKey: race.sessionKey,
    raceName: race.meetingName,
    standings: standings
      .filter((entry) => entry.team)
      .map((entry) => ({
        name: entry.team.name,
        shortName: entry.team.shortName ?? null,
        country: entry.team.country ?? null,
        colour: entry.team.color ?? "#666666",
        ...movement(entry),
      })),
  };
}

export async function getConstructorsChampionship(season: number) {
  const race = await resolveSeasonRace(ConstructorsChampionship, season);

  if (!race) {
    return { season, round: null, sessionKey: null, raceName: null, standings: [] };
  }

  return serialiseConstructorStandings(race);
}

export async function getConstructorsChampionshipAtRace(sessionKey: number) {
  return serialiseConstructorStandings(await requireRace(sessionKey));
}
