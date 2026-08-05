import mongoose from "mongoose";

import { DriverEntry, Race } from "../models";

// Every OpenF1-facing identifier is a session_key, but the models reference
// races by ObjectId. This is the single translation point between the two.
export async function getRaceIdBySessionKey(sessionKey: number) {
  const race: any = await Race.findOne({ sessionKey }, { _id: 1 }).lean();

  return race ? race._id : null;
}

export async function requireRaceIdBySessionKey(sessionKey: number) {
  const raceId = await getRaceIdBySessionKey(sessionKey);

  if (!raceId) {
    throw new Error(
      `Session ${sessionKey} has not been ingested. Run the season ingest first.`
    );
  }

  return raceId;
}

export interface SeasonEntries {
  numberByDriverId: Map<string, number>;
  driverIdByNumber: Map<number, mongoose.Types.ObjectId>;
  teamIdByDriverId: Map<string, mongoose.Types.ObjectId>;
}

// Car numbers live on DriverEntry, not Driver, so anything reporting a driver
// number needs the season's entries. One query per request builds the lookup —
// cheaper than populating an entry per document.
export async function getSeasonEntries(season: number): Promise<SeasonEntries> {
  const entries: any[] = await DriverEntry.find(
    { season },
    { driver: 1, driverNumber: 1, team: 1 }
  ).lean();

  return {
    numberByDriverId: new Map(
      entries.map((e) => [String(e.driver), e.driverNumber])
    ),
    driverIdByNumber: new Map(entries.map((e) => [e.driverNumber, e.driver])),
    teamIdByDriverId: new Map(entries.map((e) => [String(e.driver), e.team])),
  };
}

// The pair almost every race-scoped query needs: the race's id and the number
// lookup for the season it belongs to.
export async function getRaceContext(sessionKey: number) {
  const race: any = await Race.findOne(
    { sessionKey },
    { _id: 1, season: 1 }
  ).lean();

  if (!race) {
    throw new Error(
      `Session ${sessionKey} has not been ingested. Run the season ingest first.`
    );
  }

  const entries = await getSeasonEntries(race.season);

  return { raceId: race._id, season: race.season, ...entries };
}
