import mongoose from "mongoose";

import {
  Circuit,
  ConstructorsChampionship,
  DriverChampionship,
  Interval,
  Lap,
  PitStop,
  Position,
  Race,
  RaceResult,
  Stint,
} from "../models";

import {
  assignRounds,
  buildCompoundByLap,
  mapCircuit,
  mapDriverChampionship,
  mapInterval,
  mapLap,
  mapPitstop,
  mapPosition,
  mapRace,
  mapRaceResult,
  mapStint,
  mapTeamChampionship,
  normaliseCompound,
} from "../mappers";

import { upsertMany } from "../utils/mongoUpsert";
import { syncDrivers } from "./driverService";

import { OpenF1Lap, OpenF1Meeting } from "../types";

import {
  fetchDriverChampionship,
  fetchDrivers,
  fetchIntervals,
  fetchLaps,
  fetchMeetings,
  fetchPitstops,
  fetchPositions,
  fetchRaceSessions,
  fetchSessionResults,
  fetchStints,
  fetchTeamChampionship,
} from "./openf1Service";

type ObjectId = mongoose.Types.ObjectId;

// /position is a timestamped feed with no lap number. A sample belongs to the
// last lap that had started at or before its timestamp.
function buildLapResolver(laps: OpenF1Lap[]) {
  const starts = laps
    .filter((lap) => lap.date_start !== null)
    .map((lap) => ({
      lapNumber: lap.lap_number,
      at: new Date(lap.date_start as string).getTime(),
    }))
    .sort((a, b) => a.at - b.at);

  return (date: string): number | null => {
    const at = new Date(date).getTime();

    let resolved: number | null = null;

    for (const start of starts) {
      if (start.at > at) break;
      resolved = start.lapNumber;
    }

    return resolved;
  };
}

async function ingestCircuits(meetings: OpenF1Meeting[]) {
  const byKey = new Map<number, OpenF1Meeting>();
  for (const meeting of meetings) {
    byKey.set(meeting.circuit_key, meeting);
  }

  const docs = [...byKey.values()].map(mapCircuit);

  await upsertMany(Circuit, docs, (doc) => ({ circuitKey: doc.circuitKey }));

  const saved = await Circuit.find(
    { circuitKey: { $in: docs.map((d) => d.circuitKey) } },
    { circuitKey: 1 }
  ).lean();

  return new Map<number, ObjectId>(
    saved.map((c: any) => [c.circuitKey, c._id])
  );
}

async function ingestRaceSession(
  sessionKey: number,
  raceId: ObjectId,
  driverIdByNumber: Map<number, ObjectId>,
  teamIdByName: Map<string, ObjectId>
) {
  const [laps, stints, pitstops, positions, intervals, results] =
    await Promise.all([
      fetchLaps(sessionKey),
      fetchStints(sessionKey),
      fetchPitstops(sessionKey),
      fetchPositions(sessionKey),
      fetchIntervals(sessionKey),
      fetchSessionResults(sessionKey),
    ]);

  const driverId = (n: number) => driverIdByNumber.get(n);

  // Compound per lap, per driver — /laps does not carry the tyre.
  const compoundByDriver = new Map<number, Map<number, any>>();
  for (const [number] of driverIdByNumber) {
    compoundByDriver.set(
      number,
      buildCompoundByLap(stints.filter((s) => s.driver_number === number))
    );
  }

  await upsertMany(
    Stint,
    stints
      .map((s) => {
        const id = driverId(s.driver_number);
        return id ? mapStint(s, raceId, id) : null;
      })
      .filter((d): d is NonNullable<typeof d> => d !== null),
    (doc) => ({
      race: doc.race,
      driver: doc.driver,
      stintNumber: doc.stintNumber,
    })
  );

  await upsertMany(
    Lap,
    laps
      .map((lap) => {
        const id = driverId(lap.driver_number);
        if (!id) return null;

        return mapLap(lap, raceId, id, {
          compound: compoundByDriver
            .get(lap.driver_number)
            ?.get(lap.lap_number),
        });
      })
      .filter((d): d is NonNullable<typeof d> => d !== null),
    (doc) => ({
      race: doc.race,
      driver: doc.driver,
      lapNumber: doc.lapNumber,
    })
  );

  await upsertMany(
    PitStop,
    pitstops
      .map((p) => {
        const id = driverId(p.driver_number);
        return id ? mapPitstop(p, raceId, id) : null;
      })
      .filter((d): d is NonNullable<typeof d> => d !== null),
    (doc) => ({ race: doc.race, driver: doc.driver, lap: doc.lap })
  );

  const resolveLap = buildLapResolver(laps);

  await upsertMany(
    Position,
    positions
      .map((p) => {
        const id = driverId(p.driver_number);
        return id ? mapPosition(p, raceId, id, resolveLap(p.date)) : null;
      })
      .filter((d): d is NonNullable<typeof d> => d !== null),
    (doc) => ({ race: doc.race, driver: doc.driver, date: doc.date })
  );

  await upsertMany(
    Interval,
    intervals
      .map((i) => {
        const id = driverId(i.driver_number);
        return id ? mapInterval(i, raceId, id) : null;
      })
      .filter((d): d is NonNullable<typeof d> => d !== null),
    (doc) => ({ race: doc.race, driver: doc.driver, date: doc.date })
  );

  // Grid position has no OpenF1 source, so it comes from each driver's
  // earliest position sample.
  const gridByDriver = new Map<number, number>();
  for (const row of positions) {
    const seen = gridByDriver.get(row.driver_number);
    if (seen === undefined) gridByDriver.set(row.driver_number, row.position);
  }

  const finalCompoundByDriver = new Map<number, any>();
  for (const stint of stints) {
    const current = finalCompoundByDriver.get(stint.driver_number);
    if (!current || stint.stint_number >= current.stintNumber) {
      finalCompoundByDriver.set(stint.driver_number, {
        stintNumber: stint.stint_number,
        compound: normaliseCompound(stint.compound),
      });
    }
  }

  await upsertMany(
    RaceResult,
    results
      .map((result) => {
        const id = driverId(result.driver_number);
        if (!id) return null;

        return mapRaceResult(result, raceId, id, {
          gridPosition: gridByDriver.get(result.driver_number) ?? null,
          finalCompound:
            finalCompoundByDriver.get(result.driver_number)?.compound ?? null,
        });
      })
      .filter((d): d is NonNullable<typeof d> => d !== null),
    (doc) => ({ race: doc.race, driver: doc.driver })
  );

  // Championship endpoints are race-sessions-only and still in beta, so a
  // failure here must not abort the rest of the ingest.
  try {
    const [driverStandings, teamStandings] = await Promise.all([
      fetchDriverChampionship(sessionKey),
      fetchTeamChampionship(sessionKey),
    ]);

    await upsertMany(
      DriverChampionship,
      driverStandings
        .map((entry) => {
          const id = driverId(entry.driver_number);
          return id ? mapDriverChampionship(entry, raceId, id) : null;
        })
        .filter((d): d is NonNullable<typeof d> => d !== null),
      (doc) => ({ race: doc.race, driver: doc.driver })
    );

    await upsertMany(
      ConstructorsChampionship,
      teamStandings
        .map((entry) => {
          const id = teamIdByName.get(entry.team_name);
          return id ? mapTeamChampionship(entry, raceId, id) : null;
        })
        .filter((d): d is NonNullable<typeof d> => d !== null),
      (doc) => ({ race: doc.race, team: doc.team })
    );
  } catch (error) {
    console.warn(`Championship data unavailable for ${sessionKey}: ${error}`);
  }
}

export async function ingestSeason(year: number) {
  const [meetings, sessions] = await Promise.all([
    fetchMeetings(year),
    fetchRaceSessions(year),
  ]);

  const meetingByKey = new Map(meetings.map((m) => [m.meeting_key, m]));

  // /meetings includes pre-season testing, which is not a round and whose
  // circuit we do not want either. Keep only meetings that host a race.
  const raceMeetingKeys = new Set(sessions.map((s) => s.meeting_key));
  const raceMeetings = meetings.filter((m) =>
    raceMeetingKeys.has(m.meeting_key)
  );

  const roundByMeeting = assignRounds(raceMeetings);
  const circuitIdByKey = await ingestCircuits(raceMeetings);

  let ingested = 0;

  for (const session of sessions) {
    const meeting = meetingByKey.get(session.meeting_key);
    const circuitId = circuitIdByKey.get(session.circuit_key);

    if (!meeting || !circuitId) {
      console.warn(`Skipping session ${session.session_key}: no meeting/circuit`);
      continue;
    }

    try {
      const { driverIdByNumber, teamIdByName } = await syncDrivers(
        await fetchDrivers(session.session_key)
      );

      const raceDoc = mapRace(
        session,
        meeting,
        circuitId,
        roundByMeeting.get(session.meeting_key) ?? 0
      );

      await upsertMany(Race, [raceDoc], (doc) => ({
        sessionKey: doc.sessionKey,
      }));

      const race: any = await Race.findOne(
        { sessionKey: session.session_key },
        { _id: 1 }
      ).lean();

      if (!race) continue;

      await ingestRaceSession(
        session.session_key,
        race._id,
        driverIdByNumber,
        teamIdByName
      );

      ingested++;
      console.log(`Ingested ${meeting.meeting_name} (${session.session_key})`);
    } catch (error) {
      console.error(
        `Failed to ingest ${meeting.meeting_name} (${session.session_key}):`,
        error
      );
    }
  }

  return { year, races: ingested, of: sessions.length };
}
