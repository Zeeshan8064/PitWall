import mongoose from "mongoose";

import { Driver, RaceResult } from "../models";
import { mapDriver } from "../mappers";
import { OpenF1Driver } from "../types";
import { upsertMany } from "../utils/mongoUpsert";
import { requireRaceIdBySessionKey } from "./raceLookup";
import { syncTeams } from "./teamService";

// ─── Ingest ─────────────────────────────────────────────────────────────────

// Teams have to exist before drivers, since Driver.team is a ref. Returns a
// driverNumber -> ObjectId lookup for the rest of the ingest.
export async function syncDrivers(drivers: OpenF1Driver[]) {
  const teamIdByName = await syncTeams(drivers);

  const docs = drivers
    .map((driver) => {
      const teamId = teamIdByName.get(driver.team_name);
      return teamId ? mapDriver(driver, teamId) : null;
    })
    .filter((doc): doc is NonNullable<typeof doc> => doc !== null);

  await upsertMany(Driver, docs, (doc) => ({
    driverNumber: doc.driverNumber,
  }));

  const saved = await Driver.find(
    { driverNumber: { $in: docs.map((doc) => doc.driverNumber) } },
    { driverNumber: 1 }
  ).lean();

  return {
    teamIdByName,
    driverIdByNumber: new Map<number, mongoose.Types.ObjectId>(
      saved.map((driver: any) => [driver.driverNumber, driver._id])
    ),
  };
}

// ─── Queries ────────────────────────────────────────────────────────────────

// The model splits name and team out across documents, so the flat shape the
// API has always returned is recomposed here.
function serialiseDriver(driver: any) {
  return {
    driverNumber: driver.driverNumber,
    firstName: driver.firstName,
    lastName: driver.lastName,
    fullName: `${driver.firstName} ${driver.lastName}`.trim(),
    acronym: driver.abbreviation,
    team: driver.team?.name ?? null,
    teamColour: driver.team?.color ?? "#666666",
    headshotUrl: driver.headshotUrl ?? null,
    countryCode: driver.nationality ?? null,
  };
}

export async function getAllDrivers() {
  const drivers = await Driver.find()
    .populate("team")
    .sort({ driverNumber: 1 })
    .lean();

  return drivers.map(serialiseDriver);
}

// Drivers who actually took part in a given race, via their results.
export async function getDrivers(sessionKey: number) {
  const raceId = await requireRaceIdBySessionKey(sessionKey);

  const results: any[] = await RaceResult.find({ race: raceId })
    .populate({ path: "driver", populate: { path: "team" } })
    .lean();

  return results
    .filter((result) => result.driver)
    .map((result) => serialiseDriver(result.driver));
}

export async function getDriver(sessionKey: number, driverNumber: number) {
  const drivers = await getDrivers(sessionKey);

  return drivers.find((driver) => driver.driverNumber === driverNumber) ?? null;
}
