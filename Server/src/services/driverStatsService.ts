import mongoose from "mongoose";

import { RACE_SESSION_FILTER, SESSION_TYPES } from "../constants";
import { DriverChampionship, DriverEntry, Race, RaceResult } from "../models";
import { DRIVERS_PAGE_SEASON } from "./driverService";
import { getSeasonEntries } from "./raceLookup";

// Previously this walked every race in the season, fetching a full position
// feed per race over the rate-limited OpenF1 client. It is now one aggregation
// over the ingested results.

const EMPTY_STATS = {
  starts: 0,
  wins: 0,
  podiums: 0,
  poles: 0,
  frontRows: 0,
  pointsFinishes: 0,
  dnfs: 0,
  finishRate: 0,
  bestFinish: null as number | null,
  averageFinish: 0,
  averageGrid: null as number | null,
  placesGained: 0,
  lapsCompleted: 0,
  racePoints: 0,
  sprintPoints: 0,
  totalPoints: 0,
};

const EMPTY_CHAMPIONSHIP = {
  points: 0,
  position: null as number | null,
  positionChange: 0,
  pointsGained: 0,
  round: null as number | null,
};

// ─── Season stats ───────────────────────────────────────────────────────────

// DNS entries are excluded throughout: a driver who never took the start did
// not have a race, and counting one would distort every average below.
//
// `year` of null aggregates every ingested season — the career total. Career
// here means "across the seasons this database holds", which is 2024 onward,
// not a driver's whole time in the sport.
async function aggregateSeasonStats(
  driverId: mongoose.Types.ObjectId,
  year: number | null
) {
  const [stats] = await RaceResult.aggregate([
    { $match: { driver: driverId } },
    {
      $lookup: {
        from: "races",
        localField: "race",
        foreignField: "_id",
        as: "race",
      },
    },
    { $unwind: "$race" },
    // Races and sprints, never qualifying — a pole must not be counted as a
    // win. Sprints are admitted only so their points can be totalled; every
    // other figure below is gated to race sessions, because a sprint win is
    // not a Grand Prix win.
    {
      $match: {
        ...(year === null ? {} : { "race.season": year }),
        "race.sessionType": {
          $in: [SESSION_TYPES.RACE, SESSION_TYPES.SPRINT, null],
        },
        status: { $ne: "DNS" },
      },
    },
    {
      // Documents ingested before sessionType existed are race sessions.
      $addFields: {
        isRace: {
          $in: ["$race.sessionType", [SESSION_TYPES.RACE, null]],
        },
        isSprint: { $eq: ["$race.sessionType", SESSION_TYPES.SPRINT] },
      },
    },
    {
      $group: {
        _id: null,
        starts: { $sum: { $cond: ["$isRace", 1, 0] } },
        wins: {
          $sum: {
            $cond: [
              { $and: ["$isRace", { $eq: ["$finishPosition", 1] }] },
              1,
              0,
            ],
          },
        },
        podiums: {
          $sum: {
            $cond: [
              {
                $and: [
                  "$isRace",
                  { $ne: ["$finishPosition", null] },
                  { $lte: ["$finishPosition", 3] },
                ],
              },
              1,
              0,
            ],
          },
        },
        poles: {
          $sum: {
            $cond: [
              { $and: ["$isRace", { $eq: ["$gridPosition", 1] }] },
              1,
              0,
            ],
          },
        },
        frontRows: {
          $sum: {
            $cond: [
              {
                $and: [
                  "$isRace",
                  { $ne: ["$gridPosition", null] },
                  { $lte: ["$gridPosition", 2] },
                ],
              },
              1,
              0,
            ],
          },
        },
        pointsFinishes: {
          $sum: {
            $cond: [{ $and: ["$isRace", { $gt: ["$points", 0] }] }, 1, 0],
          },
        },
        // DSQ is counted as a non-finish alongside DNF — from a "did the car
        // see the flag classified" standpoint they read the same on a stat card.
        dnfs: {
          $sum: {
            $cond: [
              { $and: ["$isRace", { $in: ["$status", ["DNF", "DSQ"]] }] },
              1,
              0,
            ],
          },
        },
        finishes: {
          $sum: {
            $cond: [
              { $and: ["$isRace", { $eq: ["$status", "FINISHED"] }] },
              1,
              0,
            ],
          },
        },
        // Nulled for sprints so $min and $avg skip them entirely rather than
        // folding a sprint result into a Grand Prix average.
        bestFinish: {
          $min: { $cond: ["$isRace", "$finishPosition", null] },
        },
        // $avg skips nulls, so a retirement does not drag the average down.
        // averageGrid is therefore over a different denominator than
        // averageFinish whenever a grid slot is unknown.
        averageFinish: {
          $avg: { $cond: ["$isRace", "$finishPosition", null] },
        },
        averageGrid: {
          $avg: { $cond: ["$isRace", "$gridPosition", null] },
        },
        // Net positions made up from the grid. Only counts races where both
        // ends are known; OpenF1's starting grid is missing for many sessions.
        placesGained: {
          $sum: {
            $cond: [
              {
                $and: [
                  "$isRace",
                  { $ne: ["$gridPosition", null] },
                  { $ne: ["$finishPosition", null] },
                ],
              },
              { $subtract: ["$gridPosition", "$finishPosition"] },
              0,
            ],
          },
        },
        lapsCompleted: {
          $sum: {
            $cond: ["$isRace", { $ifNull: ["$numberOfLaps", 0] }, 0],
          },
        },
        racePoints: {
          $sum: { $cond: ["$isRace", "$points", 0] },
        },
        // Sprints award points and nothing else here. Without them the points
        // total disagrees with the championship standings, which do count them.
        sprintPoints: {
          $sum: { $cond: ["$isSprint", "$points", 0] },
        },
      },
    },
  ]);

  if (!stats) {
    return { ...EMPTY_STATS };
  }

  return {
    starts: stats.starts,
    wins: stats.wins,
    podiums: stats.podiums,
    poles: stats.poles,
    frontRows: stats.frontRows,
    pointsFinishes: stats.pointsFinishes,
    dnfs: stats.dnfs,
    finishRate: stats.starts ? stats.finishes / stats.starts : 0,
    bestFinish: stats.bestFinish ?? null,
    averageFinish: stats.averageFinish ?? 0,
    averageGrid: stats.averageGrid ?? null,
    placesGained: stats.placesGained,
    lapsCompleted: stats.lapsCompleted,
    sprintPoints: stats.sprintPoints,
    // What the championship actually counts, and therefore what a "Points"
    // figure must show if it is not to contradict the standings.
    totalPoints: stats.racePoints + stats.sprintPoints,
    racePoints: stats.racePoints,
  };
}

// ─── Timeline ───────────────────────────────────────────────────────────────

// Round-by-round results joined with the standings after each round. This is
// what the points-progression line and the season results strip both read.
async function buildTimeline(
  driverId: mongoose.Types.ObjectId,
  year: number
) {
  const races: any[] = await Race.find(
    { season: year, ...RACE_SESSION_FILTER },
    { _id: 1, round: 1, sessionKey: 1, meetingName: 1 }
  )
    .sort({ round: 1 })
    .lean();

  if (races.length === 0) {
    return [];
  }

  const raceIds = races.map((race) => race._id);

  const [results, standings] = await Promise.all([
    RaceResult.find({ driver: driverId, race: { $in: raceIds } }).lean(),
    DriverChampionship.find({
      driver: driverId,
      race: { $in: raceIds },
    }).lean(),
  ]);

  const resultByRace = new Map<string, any>(
    results.map((r: any) => [String(r.race), r])
  );
  const standingByRace = new Map<string, any>(
    standings.map((s: any) => [String(s.race), s])
  );

  // Every round of the season appears, with nulls where the driver did not
  // take part — a gap in the strip is meaningful and should not be collapsed.
  const timeline = races.map((race) => {
    const result = resultByRace.get(String(race._id));
    const standing = standingByRace.get(String(race._id));

    return {
      // Kept for the caller's movement figures, stripped before it leaves.
      standing: standing ?? null,
      round: race.round,
      sessionKey: race.sessionKey,
      raceName: race.meetingName,
      gridPosition: result?.gridPosition ?? null,
      finishPosition: result?.finishPosition ?? null,
      status: result?.status ?? null,
      points: result?.points ?? null,
      championshipPoints: standing?.pointsCurrent ?? null,
      championshipPosition: standing?.positionCurrent ?? null,
    };
  });

  return timeline;
}

// The standings after the driver's latest round with championship data. Not
// necessarily the last round of the season — the championship endpoints are
// beta and can be missing for a given race.
function latestChampionship(timeline: any[]) {
  for (let i = timeline.length - 1; i >= 0; i--) {
    const entry = timeline[i];

    if (entry.championshipPosition !== null) {
      return entry;
    }
  }

  return null;
}

// ─── Public query ───────────────────────────────────────────────────────────

// A car number only identifies a driver within a season — #1 belongs to
// whoever holds the title — so identity is resolved through the current
// season's entries and then followed across every other season by driver id,
// whatever number they wore at the time.
async function resolveDriverId(driverNumber: number) {
  const current = await getSeasonEntries(DRIVERS_PAGE_SEASON);

  const fromCurrent = current.driverIdByNumber.get(driverNumber);

  if (fromCurrent) return fromCurrent;

  // A number not on the current grid: fall back to the most recent season
  // that used it, so retired drivers still resolve.
  const entry: any = await DriverEntry.findOne(
    { driverNumber },
    { driver: 1 }
  )
    .sort({ season: -1 })
    .lean();

  return entry?.driver ?? null;
}

// Seasons this driver actually raced in, newest first — what the season
// selector is built from.
async function getDriverSeasons(driverId: mongoose.Types.ObjectId) {
  const raceIds = await RaceResult.distinct("race", { driver: driverId });

  const seasons: number[] = await Race.distinct("season", {
    _id: { $in: raceIds },
    ...RACE_SESSION_FILTER,
  });

  return seasons.sort((a, b) => b - a);
}

// `year` may be a season, or null for career totals across every ingested
// season. Championship standings and the round timeline are season-scoped
// concepts, so they are only returned when a specific season is asked for.
export async function getDriverSeasonStats(
  driverNumber: number,
  year: number | null = DRIVERS_PAGE_SEASON
) {
  const driverId = await resolveDriverId(driverNumber);

  if (!driverId) {
    return {
      season: year,
      availableSeasons: [],
      stats: { ...EMPTY_STATS },
      championship: { ...EMPTY_CHAMPIONSHIP },
      timeline: [],
    };
  }

  const availableSeasons = await getDriverSeasons(driverId);

  const [stats, internalTimeline] = await Promise.all([
    aggregateSeasonStats(driverId, year),
    year === null ? Promise.resolve([]) : buildTimeline(driverId, year),
  ]);

  const latest = latestChampionship(internalTimeline);
  const standing = latest?.standing;

  const timeline = internalTimeline.map(({ standing: _ignored, ...entry }) => entry);

  return {
    season: year,
    availableSeasons,
    stats,
    championship: latest
      ? {
          // Championship points are authoritative when standings exist —
          // they include sprint points, which RaceResult does not carry.
          points: latest.championshipPoints,
          position: latest.championshipPosition,
          positionChange: standing
            ? standing.positionStart - standing.positionCurrent
            : 0,
          pointsGained: standing
            ? standing.pointsCurrent - standing.pointsStart
            : 0,
          round: latest.round,
        }
      : // No standings ingested for this season: fall back to summed race
        // points so the card still shows something truthful, with no position.
        { ...EMPTY_CHAMPIONSHIP, points: stats.racePoints },
    timeline,
  };
}
