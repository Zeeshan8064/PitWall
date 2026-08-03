import mongoose from "mongoose";

import { Team } from "../models";
import { mapTeam } from "../mappers";
import { OpenF1Driver } from "../types";
import { upsertMany } from "../utils/mongoUpsert";

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

export async function getTeams() {
  const teams: any[] = await Team.find().sort({ name: 1 }).lean();

  return teams.map((team) => ({
    name: team.name,
    shortName: team.shortName ?? null,
    country: team.country ?? null,
    color: team.color ?? "#666666",
  }));
}
