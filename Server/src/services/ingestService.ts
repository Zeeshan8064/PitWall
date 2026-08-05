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
  downsampleIntervals,
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

import {
  normaliseSessionType,
  RACE_SESSION_FILTER,
  SESSION_META,
  SESSION_TYPES,
} from "../constants";
import { upsertMany } from "../utils/mongoUpsert";
import { buildLapResolver } from "../utils/lapResolver";
import { buildOutlinePath, pickOutlineLap } from "../utils/trackOutline";
import { syncDrivers } from "./driverService";

import { OpenF1Lap, OpenF1Meeting } from "../types";

import {
  fetchDriverChampionship,
  fetchDrivers,
  fetchIntervals,
  fetchLaps,
  fetchLocation,
  fetchMeetings,
  fetchPitstops,
  fetchPositions,
  fetchSessionResults,
  fetchSessions,
  fetchStints,
  fetchTeamChampionship,
} from "./openf1Service";

type ObjectId = mongoose.Types.ObjectId;

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

// The {season, round} unique index predates multi-session support and would
// reject the second session of a weekend. Mongoose creates the replacement
// index but never drops the old one, so ingest does it — idempotently, and
// only for this specific superseded index.
export async function ensureSessionIndexes() {
  try {
    const indexes = await Race.collection.indexes();

    if (indexes.some((index) => index.name === "season_1_round_1")) {
      await Race.collection.dropIndex("season_1_round_1");
      console.log("Dropped superseded index season_1_round_1 on races");
    }
  } catch (error) {
    console.warn(`Could not check/drop the legacy round index: ${error}`);
  }
}

// Traces the circuit's shape from one flying lap, but only if we do not
// already have it. A track's outline is the same for every session of every
// season, so this costs one extra request per circuit on a first ingest and
// nothing at all afterwards.
//
// Failure is never fatal: the client falls back to a decorative shape, which
// is a better outcome than aborting a session's ingest over artwork.
async function ensureCircuitOutline(
  circuitId: ObjectId,
  sessionKey: number,
  season: number,
  laps: OpenF1Lap[]
) {
  try {
    const circuit: any = await Circuit.findById(circuitId, {
      outlinePath: 1,
    }).lean();

    if (!circuit || circuit.outlinePath) return;

    const lap = pickOutlineLap(laps);

    if (!lap || !lap.date_start || !lap.lap_duration) return;

    const from = new Date(lap.date_start);
    const to = new Date(from.getTime() + lap.lap_duration * 1000);

    const samples = await fetchLocation(
      sessionKey,
      lap.driver_number,
      from,
      to
    );

    const outlinePath = buildOutlinePath(samples);

    if (!outlinePath) {
      console.warn(
        `Could not trace a closed outline for circuit ${circuitId} from ` +
          `session ${sessionKey} — leaving it unset`
      );
      return;
    }

    await Circuit.updateOne(
      { _id: circuitId },
      {
        $set: {
          outlinePath,
          outlineMeta: {
            season,
            sessionKey,
            driverNumber: lap.driver_number,
            lapNumber: lap.lap_number,
            generatedAt: new Date(),
          },
        },
      }
    );

    console.log(
      `  traced circuit outline from #${lap.driver_number} lap ${lap.lap_number} ` +
        `(${outlinePath.length} bytes)`
    );
  } catch (error) {
    console.warn(`Circuit outline unavailable for session ${sessionKey}: ${error}`);
  }
}

// Named for the collection it fills rather than the session it reads: every
// session type goes through here. Qualifying has no pit stops or intervals to
// speak of, which simply means those upserts get an empty list.
async function ingestSessionData(
  sessionKey: number,
  sessionType: string,
  raceId: ObjectId,
  circuitId: ObjectId,
  season: number,
  driverIdByNumber: Map<number, ObjectId>,
  teamIdByName: Map<string, ObjectId>
) {
  const capabilities = SESSION_META[sessionType] ?? SESSION_META[SESSION_TYPES.RACE];

  // Sequential on purpose. These all resolve through the same rate limiter, so
  // firing them together buys no throughput — it only means that when one is
  // rate limited, all of them are, and each then burns its own retry budget
  // against a limiter that is already in cooldown.
  //
  // Endpoints a session type does not have are skipped rather than requested
  // and discarded — see SESSION_META for the measurements behind that.
  const laps = await fetchLaps(sessionKey);
  const stints = await fetchStints(sessionKey);
  const positions = await fetchPositions(sessionKey);
  const results = await fetchSessionResults(sessionKey);

  const pitstops = capabilities.hasPitStops
    ? await fetchPitstops(sessionKey)
    : [];

  const intervals = capabilities.hasIntervals
    ? await fetchIntervals(sessionKey)
    : [];

  // Runs off the laps just fetched, so it needs no extra lap request — and
  // no-ops entirely once the circuit has an outline.
  await ensureCircuitOutline(circuitId, sessionKey, season, laps);

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
    downsampleIntervals(intervals, resolveLap)
      .map(({ row, lapNumber }) => {
        const id = driverId(row.driver_number);
        return id ? mapInterval(row, raceId, id, lapNumber) : null;
      })
      .filter((d): d is NonNullable<typeof d> => d !== null),
    (doc) => ({
      race: doc.race,
      driver: doc.driver,
      lapNumber: doc.lapNumber,
    })
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
  if (!capabilities.hasChampionship) {
    return;
  }

  try {
    const driverStandings = await fetchDriverChampionship(sessionKey);
    const teamStandings = await fetchTeamChampionship(sessionKey);

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

// Traces outlines for circuits that do not have one yet, without re-ingesting
// anything else. Needed because ensureCircuitOutline runs inside the session
// ingest, and a season whose sessions are all complete skips that entirely —
// so a plain re-run would never reach it.
//
// Costs two requests per untraced circuit (laps, then location) rather than
// the full re-fetch that --force would trigger.
export interface OutlineBackfillSummary {
  total: number;
  traced: number;
  // Already had an outline; left untouched. This is what makes re-running
  // free rather than destructive.
  skipped: number;
  failed: number;
  failures: string[];
}

export async function backfillCircuitOutlines(
  year: number
): Promise<OutlineBackfillSummary> {
  // Every circuit is loaded, not just the untraced ones, so the summary can
  // report what was left alone rather than silently omitting it.
  const circuits: any[] = await Circuit.find({}, { _id: 1, name: 1, outlinePath: 1 })
    .sort({ name: 1 })
    .lean();

  const summary: OutlineBackfillSummary = {
    total: circuits.length,
    traced: 0,
    skipped: 0,
    failed: 0,
    failures: [],
  };

  for (const [index, circuit] of circuits.entries()) {
    const label = `[${index + 1}/${circuits.length}] ${circuit.name}`;

    if (circuit.outlinePath) {
      summary.skipped++;
      console.log(`${label} — already traced, leaving alone`);
      continue;
    }

    // Any race session at this circuit will do; the shape is the same for all
    // of them. Only sessions already in the database are used, so nothing
    // outside the Circuit document is fetched or modified.
    const race: any = await Race.findOne(
      { season: year, circuit: circuit._id, ...RACE_SESSION_FILTER },
      { sessionKey: 1 }
    ).lean();

    if (!race) {
      summary.failed++;
      summary.failures.push(`${circuit.name} (no ingested ${year} race session)`);
      console.warn(`${label} — no ingested ${year} race session`);
      continue;
    }

    try {
      const laps = await fetchLaps(race.sessionKey);

      // A session that has not been run yet returns no laps. That is a
      // different problem from a lap that would not trace, and reporting them
      // the same way sends you looking for a bug that is not there.
      if (laps.length === 0) {
        summary.failed++;
        summary.failures.push(
          `${circuit.name} (no lap data — session not yet run or cancelled)`
        );
        console.warn(`${label} — no lap data for session ${race.sessionKey}`);
        continue;
      }

      await ensureCircuitOutline(circuit._id, race.sessionKey, year, laps);

      // ensureCircuitOutline deliberately swallows its own failures so it can
      // never break an ingest, which means it cannot report success. Confirm
      // against the stored document instead of assuming.
      const updated: any = await Circuit.findById(circuit._id, {
        outlinePath: 1,
      }).lean();

      if (updated?.outlinePath) {
        summary.traced++;
        console.log(`${label} — traced (${updated.outlinePath.length} bytes)`);
      } else {
        summary.failed++;
        summary.failures.push(`${circuit.name} (lap did not trace a closed loop)`);
        console.warn(`${label} — could not trace, keeping fallback shape`);
      }
    } catch (error) {
      // One unreachable circuit must not end the run; the rest can still be
      // traced and the failure is reported at the end.
      summary.failed++;
      summary.failures.push(`${circuit.name} (${error})`);
      console.warn(`${label} — failed: ${error}`);
    }
  }

  return summary;
}

// Removes Race documents for a season that OpenF1 no longer lists as live
// sessions, along with everything referencing them. These are usually races
// that were cancelled after being ingested — 2026 Bahrain and Jeddah are the
// known cases — and they keep a round number, which shifts every later round.
//
// Deliberately opt-in: this deletes data, and a transient API response
// omitting sessions must never be able to trigger it silently.
async function pruneStaleSessions(year: number, liveKeys: Set<number>) {
  const stale: any[] = await Race.find(
    { season: year, sessionKey: { $nin: [...liveKeys] } },
    { _id: 1, sessionKey: 1, meetingName: 1, sessionType: 1 }
  ).lean();

  if (stale.length === 0) {
    console.log("Prune: nothing stale to remove.");
    return 0;
  }

  console.log(`Prune: removing ${stale.length} session(s) no longer in OpenF1:`);
  for (const race of stale) {
    console.log(`  · ${race.meetingName} — ${race.sessionType} (${race.sessionKey})`);
  }

  const raceIds = stale.map((race) => race._id);

  // Children first, so a failure part-way cannot orphan rows behind a
  // still-present parent. Typed loosely because the models form a union
  // mongoose cannot build a shared query filter for.
  const childModels: mongoose.Model<any>[] = [
    Lap,
    Stint,
    PitStop,
    Position,
    Interval,
    RaceResult,
    DriverChampionship,
    ConstructorsChampionship,
  ];

  for (const model of childModels) {
    const { deletedCount } = await model.deleteMany({ race: { $in: raceIds } });

    if (deletedCount) {
      console.log(`    ${model.modelName}: ${deletedCount} removed`);
    }
  }

  await Race.deleteMany({ _id: { $in: raceIds } });

  return stale.length;
}

interface IngestOptions {
  // Re-fetch sessions that already have results. Off by default so an
  // interrupted run can be resumed without paying for the work twice.
  force?: boolean;

  // Delete previously ingested sessions that OpenF1 no longer lists.
  prune?: boolean;
}

export async function ingestSeason(year: number, options: IngestOptions = {}) {
  await ensureSessionIndexes();

  const meetings = await fetchMeetings(year);

  // One /sessions call, filtered locally. fetchRaceSessions and
  // fetchReplaySessions each hit the endpoint themselves, so asking for both
  // was two requests for the same payload.
  const allSessions = await fetchSessions(year);

  const sessions = allSessions.filter(
    (session) =>
      normaliseSessionType(session.session_name) !== null &&
      !session.is_cancelled
  );

  const raceSessions = sessions.filter(
    (session) => session.session_name === SESSION_TYPES.RACE
  );

  const meetingByKey = new Map(meetings.map((m) => [m.meeting_key, m]));

  // /meetings includes pre-season testing, which is not a round and whose
  // circuit we do not want either. Keep only meetings that host a race —
  // rounds are still numbered by race, not by any other session.
  const raceMeetingKeys = new Set(raceSessions.map((s) => s.meeting_key));
  const raceMeetings = meetings.filter((m) =>
    raceMeetingKeys.has(m.meeting_key)
  );

  const roundByMeeting = assignRounds(raceMeetings);
  const circuitIdByKey = await ingestCircuits(raceMeetings);

  // A session whose weekend has no race is testing, and takes no round.
  const weekendSessions = sessions.filter((session) =>
    raceMeetingKeys.has(session.meeting_key)
  );

  if (options.prune) {
    await pruneStaleSessions(
      year,
      new Set(weekendSessions.map((session) => session.session_key))
    );
  }

  let ingested = 0;
  let skipped = 0;
  let position = 0;

  // The driver list is identical across a weekend's sessions, so fetching it
  // per session was ~3x the requests for the same answer.
  const driversByMeeting = new Map<
    number,
    { driverIdByNumber: Map<number, ObjectId>; teamIdByName: Map<string, ObjectId> }
  >();

  for (const session of weekendSessions) {
    position++;

    const meeting = meetingByKey.get(session.meeting_key);
    const circuitId = circuitIdByKey.get(session.circuit_key);

    if (!meeting || !circuitId) {
      console.warn(`Skipping session ${session.session_key}: no meeting/circuit`);
      continue;
    }

    const label = `[${position}/${weekendSessions.length}] ${meeting.meeting_name} — ${session.session_name}`;

    try {
      const raceDoc = mapRace(
        session,
        meeting,
        circuitId,
        roundByMeeting.get(session.meeting_key) ?? 0
      );

      // Written before the resume check, and on every run. Round numbers and
      // names are derived from the session list rather than fetched, so this
      // costs no request — and skipping it would freeze a session's metadata
      // at whatever an earlier run computed. That is how two ingests with
      // different round numbering ended up coexisting in one collection.
      await upsertMany(Race, [raceDoc], (doc) => ({
        sessionKey: doc.sessionKey,
      }));

      const race: any = await Race.findOne(
        { sessionKey: session.session_key },
        { _id: 1 }
      ).lean();

      if (!race) continue;

      // Resume support: a session that already has results was completed by an
      // earlier run, and re-fetching its data is pure cost.
      if (!options.force) {
        const haveResults = await RaceResult.countDocuments({ race: race._id });

        if (haveResults > 0) {
          skipped++;
          console.log(`${label} — already ingested, metadata refreshed`);
          continue;
        }
      }

      let entrants = driversByMeeting.get(session.meeting_key);

      if (!entrants) {
        entrants = await syncDrivers(
          await fetchDrivers(session.session_key),
          session.year
        );

        driversByMeeting.set(session.meeting_key, entrants);
      }

      const { driverIdByNumber, teamIdByName } = entrants;

      await ingestSessionData(
        session.session_key,
        raceDoc.sessionType,
        race._id,
        circuitId,
        session.year,
        driverIdByNumber,
        teamIdByName
      );

      ingested++;
      console.log(`${label} — ingested (${session.session_key})`);
    } catch (error) {
      // Logged and stepped over: one unavailable session must not cost the
      // whole run, which by this point may be twenty minutes in.
      console.error(`${label} — FAILED (${session.session_key}):`, error);
    }
  }

  return {
    year,
    sessions: ingested,
    skipped,
    of: weekendSessions.length,
  };
}
