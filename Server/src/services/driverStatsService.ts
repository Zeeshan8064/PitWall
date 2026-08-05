import mongoose from "mongoose";

import { RACE_SESSION_FILTER } from "../constants";
import { DriverChampionship, Race, RaceResult } from "../models";
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
async function aggregateSeasonStats(
  driverId: mongoose.Types.ObjectId,
  year: number
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
    // Race sessions only. Without this, qualifying results would count as
    // race starts, and a pole would be indistinguishable from a win.
    {
      $match: {
        "race.season": year,
        "race.sessionType": RACE_SESSION_FILTER.sessionType,
        status: { $ne: "DNS" },
      },
    },
    {
      $group: {
        _id: null,
        starts: { $sum: 1 },
        wins: {
          $sum: { $cond: [{ $eq: ["$finishPosition", 1] }, 1, 0] },
        },
        podiums: {
          $sum: {
            $cond: [
              {
                $and: [
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
          $sum: { $cond: [{ $eq: ["$gridPosition", 1] }, 1, 0] },
        },
        frontRows: {
          $sum: {
            $cond: [
              {
                $and: [
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
          $sum: { $cond: [{ $gt: ["$points", 0] }, 1, 0] },
        },
        // DSQ is counted as a non-finish alongside DNF — from a "did the car
        // see the flag classified" standpoint they read the same on a stat card.
        dnfs: {
          $sum: {
            $cond: [{ $in: ["$status", ["DNF", "DSQ"]] }, 1, 0],
          },
        },
        finishes: {
          $sum: { $cond: [{ $eq: ["$status", "FINISHED"] }, 1, 0] },
        },
        bestFinish: { $min: "$finishPosition" },
        // $avg skips nulls, so a retirement does not drag the average down.
        // averageGrid is therefore over a different denominator than
        // averageFinish whenever a grid slot is unknown.
        averageFinish: { $avg: "$finishPosition" },
        averageGrid: { $avg: "$gridPosition" },
        // Net positions made up from the grid. Only counts races where both
        // ends are known; OpenF1's starting grid is missing for many sessions.
        placesGained: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$gridPosition", null] },
                  { $ne: ["$finishPosition", null] },
                ],
              },
              { $subtract: ["$gridPosition", "$finishPosition"] },
              0,
            ],
          },
        },
        lapsCompleted: { $sum: { $ifNull: ["$numberOfLaps", 0] } },
        racePoints: { $sum: "$points" },
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

// A car number only identifies a driver within a season, so the number has to
// be resolved through that season's entries rather than globally.
export async function getDriverSeasonStats(driverNumber: number, year = 2026) {
  const { driverIdByNumber } = await getSeasonEntries(year);

  const driverId = driverIdByNumber.get(driverNumber);

  if (!driverId) {
    return {
      season: year,
      stats: { ...EMPTY_STATS },
      championship: { ...EMPTY_CHAMPIONSHIP },
      timeline: [],
    };
  }

  const [stats, internalTimeline] = await Promise.all([
    aggregateSeasonStats(driverId, year),
    buildTimeline(driverId, year),
  ]);

  const latest = latestChampionship(internalTimeline);
  const standing = latest?.standing;

  const timeline = internalTimeline.map(({ standing: _ignored, ...entry }) => entry);

  return {
    season: year,
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
