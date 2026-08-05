import mongoose from "mongoose";

import { RACE_SESSION_FILTER } from "../constants";
import {
  ConstructorsChampionship,
  DriverEntry,
  Race,
  RaceResult,
  Team,
} from "../models";
import { mapTeam } from "../mappers";
import { OpenF1Driver } from "../types";
import { upsertMany } from "../utils/mongoUpsert";
import { toSlug } from "../utils/slug";

// Upserts every distinct team in a driver list and returns a name -> ObjectId
// lookup, which is what Driver and ConstructorsChampionship need to resolve
// their refs.
export async function syncTeams(drivers: OpenF1Driver[]) {
  const uniqueTeams = new Map<string, OpenF1Driver>();

  for (const driver of drivers) {
    uniqueTeams.set(driver.team_name, driver);
  }

  const docs = [...uniqueTeams.values()].map(mapTeam);

  await upsertMany(Team, docs, (doc) => ({ name: doc.name }));

  const saved = await Team.find(
    { name: { $in: docs.map((doc) => doc.name) } },
    { name: 1 }
  ).lean();

  return new Map<string, mongoose.Types.ObjectId>(
    saved.map((team: any) => [team.name, team._id])
  );
}

// The Team collection accumulates every constructor across every ingested
// season, so an unfiltered list mixes defunct teams in with the current grid.
// Scoping by season means "teams that hold a seat that season", which is the
// same definition the Drivers page uses.
export async function getTeams(season?: number) {
  const filter: Record<string, any> = {};

  if (season !== undefined) {
    const teamIds = await DriverEntry.distinct("team", { season });

    filter._id = { $in: teamIds };
  }

  const teams: any[] = await Team.find(filter).sort({ name: 1 }).lean();

  return teams.map(serialiseTeam);
}

function serialiseTeam(team: any) {
  return {
    name: team.name,
    // Route identity. Derived rather than stored so it cannot go stale
    // against the name it is built from.
    slug: toSlug(team.name),
    shortName: team.shortName ?? null,
    country: team.country ?? null,
    color: team.color ?? "#666666",
  };
}

// A constructor's season: who drove, where they stand, and what the two cars
// scored between them. RaceResult refs drivers rather than teams, so the seats
// are resolved first and the results aggregated across them.
export async function getTeamDetail(slug: string, season: number) {
  const teams: any[] = await Team.find().lean();

  const team = teams.find((candidate) => toSlug(candidate.name) === slug);

  if (!team) {
    throw new Error(`No team matching "${slug}"`);
  }

  const entries: any[] = await DriverEntry.find({ season, team: team._id })
    .populate("driver")
    .sort({ driverNumber: 1 })
    .lean();

  const driverIds = entries.map((entry) => entry.driver?._id).filter(Boolean);

  const [stats] = await RaceResult.aggregate([
    { $match: { driver: { $in: driverIds } } },
    {
      $lookup: {
        from: "races",
        localField: "race",
        foreignField: "_id",
        as: "race",
      },
    },
    { $unwind: "$race" },
    {
      $match: {
        "race.season": season,
        "race.sessionType": RACE_SESSION_FILTER.sessionType,
        status: { $ne: "DNS" },
      },
    },
    {
      $group: {
        _id: null,
        // Entries, not races: two cars start each round.
        entries: { $sum: 1 },
        wins: { $sum: { $cond: [{ $eq: ["$finishPosition", 1] }, 1, 0] } },
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
        poles: { $sum: { $cond: [{ $eq: ["$gridPosition", 1] }, 1, 0] } },
        dnfs: { $sum: { $cond: [{ $in: ["$status", ["DNF", "DSQ"]] }, 1, 0] } },
        bestFinish: { $min: "$finishPosition" },
        racePoints: { $sum: "$points" },
      },
    },
  ]);

  // Points per round, for the progression line.
  const races: any[] = await Race.find(
    { season, ...RACE_SESSION_FILTER },
    { _id: 1, round: 1, meetingName: 1 }
  )
    .sort({ round: 1 })
    .lean();

  const standings: any[] = await ConstructorsChampionship.find({
    team: team._id,
    race: { $in: races.map((race) => race._id) },
  }).lean();

  const standingByRace = new Map(standings.map((s: any) => [String(s.race), s]));

  const timeline = races.map((race) => {
    const standing = standingByRace.get(String(race._id));

    return {
      round: race.round,
      raceName: race.meetingName,
      points: standing?.pointsCurrent ?? null,
      position: standing?.positionCurrent ?? null,
    };
  });

  const latest = [...timeline].reverse().find((entry) => entry.position !== null);

  return {
    team: serialiseTeam(team),
    season,
    drivers: entries
      .filter((entry) => entry.driver)
      .map((entry) => ({
        driverNumber: entry.driverNumber,
        fullName:
          entry.driver.fullName ??
          `${entry.driver.firstName} ${entry.driver.lastName}`.trim(),
        firstName: entry.driver.firstName,
        lastName: entry.driver.lastName,
        acronym: entry.driver.acronym,
        countryCode: entry.driver.nationality ?? null,
      })),
    championship: {
      points: latest?.points ?? stats?.racePoints ?? 0,
      position: latest?.position ?? null,
      round: latest?.round ?? null,
    },
    stats: {
      entries: stats?.entries ?? 0,
      wins: stats?.wins ?? 0,
      podiums: stats?.podiums ?? 0,
      poles: stats?.poles ?? 0,
      dnfs: stats?.dnfs ?? 0,
      bestFinish: stats?.bestFinish ?? null,
      racePoints: stats?.racePoints ?? 0,
    },
    timeline,
  };
}
