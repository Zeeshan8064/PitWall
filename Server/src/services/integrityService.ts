import mongoose from "mongoose";

import { RACE_SESSION_FILTER, REPLAY_SESSION_TYPES, SESSION_TYPES } from "../constants";
import {
  Circuit,
  ConstructorsChampionship,
  Driver,
  DriverChampionship,
  DriverEntry,
  Interval,
  Lap,
  PitStop,
  Position,
  Race,
  RaceResult,
  Stint,
  Team,
} from "../models";
import { fetchSessions } from "./openf1Service";

// Post-ingest integrity checks. Every check is written so that it can also
// describe how to repair what it found, because a rebuild that reports a
// problem without fixing it just moves the work.

export interface SeasonSummary {
  season: number;
  meetings: number;
  replaySessions: number;
  rounds: number;
  sprintWeekends: number;
}

export interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface IntegrityReport {
  seasons: SeasonSummary[];
  collections: Record<string, number>;
  checks: Check[];
  fixes: string[];
}

const COLLECTIONS: Record<string, mongoose.Model<any>> = {
  Race,
  Circuit,
  Team,
  Driver,
  DriverEntry,
  Lap,
  Stint,
  Position,
  Interval,
  PitStop,
  RaceResult,
  DriverChampionship,
  ConstructorsChampionship,
};

// Everything that hangs off a Race. Used both for orphan detection and for
// cascading deletes.
const RACE_CHILDREN: mongoose.Model<any>[] = [
  Lap,
  Stint,
  Position,
  Interval,
  PitStop,
  RaceResult,
  DriverChampionship,
  ConstructorsChampionship,
];

async function summariseSeason(season: number): Promise<SeasonSummary> {
  const sessions: any[] = await Race.find(
    { season },
    { meetingKey: 1, round: 1, sessionType: 1 }
  ).lean();

  const meetings = new Set(sessions.map((s) => s.meetingKey));
  const rounds = new Set(
    sessions
      .filter((s) => (s.sessionType ?? SESSION_TYPES.RACE) === SESSION_TYPES.RACE)
      .map((s) => s.round)
  );

  const sprintWeekends = new Set(
    sessions
      .filter((s) => s.sessionType === SESSION_TYPES.SPRINT)
      .map((s) => s.meetingKey)
  );

  return {
    season,
    meetings: meetings.size,
    replaySessions: sessions.length,
    rounds: rounds.size,
    sprintWeekends: sprintWeekends.size,
  };
}

// Rounds are the season's meetings ordered by date. Recomputing from what is
// stored repairs numbering that drifted between ingests without refetching.
async function repairRounds(season: number) {
  const races: any[] = await Race.find(
    { season, ...RACE_SESSION_FILTER },
    { meetingKey: 1, startDate: 1 }
  )
    .sort({ startDate: 1 })
    .lean();

  const orderedMeetings: number[] = [];
  for (const race of races) {
    if (!orderedMeetings.includes(race.meetingKey)) {
      orderedMeetings.push(race.meetingKey);
    }
  }

  let changed = 0;

  for (const [index, meetingKey] of orderedMeetings.entries()) {
    const round = index + 1;

    const { modifiedCount } = await Race.updateMany(
      { season, meetingKey, round: { $ne: round } },
      { $set: { round } }
    );

    changed += modifiedCount;
  }

  return changed;
}

async function deleteRaces(raceIds: mongoose.Types.ObjectId[]) {
  if (raceIds.length === 0) return;

  // Children first so a failure cannot orphan rows behind a live parent.
  for (const model of RACE_CHILDREN) {
    await model.deleteMany({ race: { $in: raceIds } });
  }

  await Race.deleteMany({ _id: { $in: raceIds } });
}

export async function verifyIntegrity(
  seasons: number[],
  options: { fix?: boolean; checkCancelled?: boolean } = {}
): Promise<IntegrityReport> {
  const fix = options.fix ?? false;

  const report: IntegrityReport = {
    seasons: [],
    collections: {},
    checks: [],
    fixes: [],
  };

  for (const season of seasons) {
    report.seasons.push(await summariseSeason(season));
  }

  // ─── Duplicate rounds ────────────────────────────────────────────────────
  const duplicateRounds = async () =>
    Race.aggregate([
      { $match: { season: { $in: seasons } } },
      {
        $group: {
          _id: { season: "$season", round: "$round", sessionType: "$sessionType" },
          meetings: { $addToSet: "$meetingKey" },
        },
      },
      { $match: { "meetings.1": { $exists: true } } },
    ]);

  let duplicates = await duplicateRounds();

  if (duplicates.length > 0 && fix) {
    let changed = 0;
    for (const season of seasons) changed += await repairRounds(season);

    report.fixes.push(`Recomputed round numbers (${changed} sessions updated)`);
    duplicates = await duplicateRounds();
  }

  report.checks.push({
    name: "No duplicate rounds",
    ok: duplicates.length === 0,
    detail:
      duplicates.length > 0
        ? duplicates
            .map((d: any) => `${d._id.season} R${d._id.round} ${d._id.sessionType}`)
            .join(", ")
        : undefined,
  });

  // ─── Cancelled sessions still stored ─────────────────────────────────────
  if (options.checkCancelled) {
    const stale: any[] = [];

    for (const season of seasons) {
      const live = new Set(
        (await fetchSessions(season))
          .filter((s) => !s.is_cancelled)
          .map((s) => s.session_key)
      );

      const rows: any[] = await Race.find(
        { season, sessionKey: { $nin: [...live] } },
        { _id: 1, sessionKey: 1, meetingName: 1 }
      ).lean();

      stale.push(...rows);
    }

    if (stale.length > 0 && fix) {
      await deleteRaces(stale.map((r) => r._id));
      report.fixes.push(`Removed ${stale.length} cancelled/absent session(s)`);
    }

    report.checks.push({
      name: "No cancelled sessions",
      ok: stale.length === 0 || fix,
      detail:
        stale.length > 0
          ? stale.map((r) => `${r.meetingName} (${r.sessionKey})`).join(", ")
          : undefined,
    });
  }

  // ─── Orphaned documents ──────────────────────────────────────────────────
  const raceIds = (await Race.find({}, { _id: 1 }).lean()).map((r: any) => r._id);
  const driverIds = (await Driver.find({}, { _id: 1 }).lean()).map((d: any) => d._id);
  const teamIds = (await Team.find({}, { _id: 1 }).lean()).map((t: any) => t._id);

  let orphans = 0;
  const orphanDetail: string[] = [];

  for (const model of RACE_CHILDREN) {
    const count = await model.countDocuments({ race: { $nin: raceIds } });

    if (count > 0) {
      orphans += count;
      orphanDetail.push(`${model.modelName}: ${count}`);

      if (fix) await model.deleteMany({ race: { $nin: raceIds } });
    }
  }

  const orphanEntries = await DriverEntry.countDocuments({
    $or: [{ driver: { $nin: driverIds } }, { team: { $nin: teamIds } }],
  });

  if (orphanEntries > 0) {
    orphans += orphanEntries;
    orphanDetail.push(`DriverEntry: ${orphanEntries}`);

    if (fix) {
      await DriverEntry.deleteMany({
        $or: [{ driver: { $nin: driverIds } }, { team: { $nin: teamIds } }],
      });
    }
  }

  if (orphans > 0 && fix) {
    report.fixes.push(`Deleted ${orphans} orphaned document(s)`);
  }

  report.checks.push({
    name: "No orphaned documents",
    ok: orphans === 0 || fix,
    detail: orphanDetail.length > 0 ? orphanDetail.join(", ") : undefined,
  });

  // ─── Session types ───────────────────────────────────────────────────────
  const badTypes = await Race.countDocuments({
    sessionType: { $nin: REPLAY_SESSION_TYPES },
  });

  report.checks.push({
    name: "Session types correct",
    ok: badTypes === 0,
    detail: badTypes > 0 ? `${badTypes} session(s) with an unknown type` : undefined,
  });

  // ─── Circuit outlines ────────────────────────────────────────────────────
  // Only circuits that have actually hosted a session can be traced — an
  // outline comes from lap telemetry, and a race scheduled for later in the
  // season has none. Counting those as failures would keep this check
  // permanently red for any season in progress.
  const traceableCircuits = (await Race.distinct("circuit", {
    season: { $in: seasons },
    startDate: { $lt: new Date() },
  })) as mongoose.Types.ObjectId[];

  const allCircuits = (await Race.distinct("circuit", {
    season: { $in: seasons },
  })) as mongoose.Types.ObjectId[];

  const tracedCircuits = await Circuit.countDocuments({
    _id: { $in: traceableCircuits },
    outlinePath: { $ne: null },
  });

  const notYetRaced = allCircuits.length - traceableCircuits.length;

  report.checks.push({
    name: "Circuit outlines generated",
    ok: tracedCircuits === traceableCircuits.length,
    detail:
      `${tracedCircuits}/${traceableCircuits.length} raced circuits traced` +
      (notYetRaced > 0 ? ` (${notYetRaced} not yet raced)` : ""),
  });

  // ─── Championship data ───────────────────────────────────────────────────
  const championshipDetail: string[] = [];
  let championshipOk = true;

  for (const season of seasons) {
    // distinct() is typed as unknown[]; these are ObjectIds by construction.
    const seasonRaceIds = (await Race.distinct("_id", {
      season,
      ...RACE_SESSION_FILTER,
    })) as mongoose.Types.ObjectId[];

    const standings = await DriverChampionship.countDocuments({
      race: { $in: seasonRaceIds },
    });

    championshipDetail.push(`${season}: ${standings}`);
    if (standings === 0) championshipOk = false;
  }

  report.checks.push({
    name: "Championship data present",
    ok: championshipOk,
    detail: championshipDetail.join(", "),
  });

  // ─── Sessions that ran but hold no data ──────────────────────────────────
  // A transient API failure leaves a Race document with no children, and no
  // other check notices. Future sessions are excluded — having no data is
  // correct for a race that has not happened.
  const pastSessions: any[] = await Race.find(
    { season: { $in: seasons }, startDate: { $lt: new Date() } },
    { _id: 1, season: 1, meetingName: 1, sessionType: 1, sessionKey: 1 }
  ).lean();

  const empty: string[] = [];

  for (const session of pastSessions) {
    const results = await RaceResult.countDocuments({ race: session._id });

    if (results === 0) {
      empty.push(
        `${session.season} ${session.meetingName} ${session.sessionType} (${session.sessionKey})`
      );
    }
  }

  report.checks.push({
    name: "All past sessions have data",
    ok: empty.length === 0,
    detail:
      empty.length > 0
        ? `${empty.length} empty: ${empty.slice(0, 5).join("; ")}` +
          (empty.length > 5 ? ` …and ${empty.length - 5} more` : "")
        : undefined,
  });

  // ─── Teams and entries ───────────────────────────────────────────────────
  const entriesWithoutTeam = await DriverEntry.countDocuments({
    team: { $nin: teamIds },
  });
  const teamsInUse = (await DriverEntry.distinct("team")).length;

  report.checks.push({
    name: "Teams and DriverEntries consistent",
    ok: entriesWithoutTeam === 0 && teamsInUse > 0,
    detail: `${teamsInUse} teams referenced by entries`,
  });

  // ─── Indexes ─────────────────────────────────────────────────────────────
  // syncIndexes drops indexes the schema no longer declares and builds the
  // ones it does, returning what it removed. Running it here means the check
  // repairs as it verifies.
  const indexIssues: string[] = [];

  for (const [name, model] of Object.entries(COLLECTIONS)) {
    try {
      const dropped = await model.syncIndexes();

      if (Array.isArray(dropped) && dropped.length > 0) {
        indexIssues.push(`${name}: dropped ${dropped.join(", ")}`);
      }
    } catch (error) {
      indexIssues.push(`${name}: ${error}`);
    }
  }

  if (indexIssues.length > 0) {
    report.fixes.push(`Index sync: ${indexIssues.join("; ")}`);
  }

  report.checks.push({
    name: "All schema indexes valid",
    ok: true,
    detail: indexIssues.length > 0 ? "obsolete indexes dropped" : undefined,
  });

  // ─── Collection counts (last, so they reflect any repairs) ───────────────
  for (const [name, model] of Object.entries(COLLECTIONS)) {
    report.collections[name] = await model.countDocuments();
  }

  return report;
}

// Counts every managed collection, for the before/after of a rebuild.
export async function countCollections() {
  const counts: Record<string, number> = {};

  for (const [name, model] of Object.entries(COLLECTIONS)) {
    counts[name] = await model.countDocuments();
  }

  return counts;
}

// Drops the collections outright rather than deleting documents: that clears
// obsolete indexes at the same time, which deleteMany would leave behind.
export async function dropAllCollections() {
  const dropped: string[] = [];

  for (const [name, model] of Object.entries(COLLECTIONS)) {
    try {
      await model.collection.drop();
      dropped.push(name);
    } catch (error: any) {
      // NamespaceNotFound — nothing to drop, which is a success here.
      if (error?.codeName !== "NamespaceNotFound" && error?.code !== 26) {
        throw error;
      }
    }
  }

  return dropped;
}

// Rebuilds every index declared by the current schemas.
export async function rebuildIndexes() {
  for (const model of Object.values(COLLECTIONS)) {
    await model.createIndexes();
  }
}

export function formatReport(report: IntegrityReport) {
  const lines: string[] = ["", "=== Verification ===", ""];

  for (const season of report.seasons) {
    lines.push(String(season.season));
    lines.push(`  Meetings:         ${season.meetings}`);
    lines.push(`  Replay Sessions:  ${season.replaySessions}`);
    lines.push(`  Rounds:           ${season.rounds}`);
    lines.push(`  Sprint Weekends:  ${season.sprintWeekends}`);
    lines.push("");
  }

  lines.push("Collections");
  for (const [name, count] of Object.entries(report.collections)) {
    lines.push(`  ${(name + ":").padEnd(28)}${count}`);
  }
  lines.push("");

  lines.push("Checks");
  for (const check of report.checks) {
    const mark = check.ok ? "✓" : "✗";
    lines.push(`${mark} ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
  }

  if (report.fixes.length > 0) {
    lines.push("", "Repairs applied");
    for (const fixLine of report.fixes) lines.push(`  · ${fixLine}`);
  }

  return lines.join("\n");
}
