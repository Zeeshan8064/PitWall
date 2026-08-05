import mongoose from "mongoose";

import { Driver, DriverEntry, Race, RaceResult } from "../models";
import { mapDriver, mapDriverEntry } from "../mappers";
import { OpenF1Driver } from "../types";
import { upsertMany } from "../utils/mongoUpsert";
import { syncTeams } from "./teamService";

// ─── Ingest ─────────────────────────────────────────────────────────────────

// Upserts the people, then their seats for this season. Teams come first,
// since DriverEntry.team is a ref.
//
// Returns driverNumber -> *person* ObjectId for this season, which is what the
// race-scoped collections reference.
export async function syncDrivers(drivers: OpenF1Driver[], season: number) {
  const teamIdByName = await syncTeams(drivers);

  const people = drivers.map((driver) => mapDriver(driver, season));

  // Older seasons report a null country_code and cannot use the number-keyed
  // fallback, so writing null here would erase a nationality an already
  // ingested season resolved correctly.
  await upsertMany(Driver, people, (doc) => ({ acronym: doc.acronym }), {
    omitNull: ["nationality"],
  });

  const savedPeople = await Driver.find(
    { acronym: { $in: people.map((p) => p.acronym) } },
    { acronym: 1 }
  ).lean();

  const driverIdByAcronym = new Map<string, mongoose.Types.ObjectId>(
    savedPeople.map((d: any) => [d.acronym, d._id])
  );

  const entries = drivers
    .map((driver) => {
      const driverId = driverIdByAcronym.get(driver.name_acronym);
      const teamId = teamIdByName.get(driver.team_name);

      return driverId && teamId
        ? mapDriverEntry(driver, driverId, teamId, season)
        : null;
    })
    .filter((doc): doc is NonNullable<typeof doc> => doc !== null);

  await upsertMany(DriverEntry, entries, (doc) => ({
    season: doc.season,
    driverNumber: doc.driverNumber,
  }));

  return {
    teamIdByName,
    driverIdByAcronym,
    driverIdByNumber: new Map<number, mongoose.Types.ObjectId>(
      entries.map((entry) => [entry.driverNumber, entry.driver])
    ),
  };
}

// ─── Queries ────────────────────────────────────────────────────────────────

// The season the Drivers page shows. The local driver renders in
// Client/public/drivers are named by 2026 car number, so this is fixed rather
// than derived.
export const DRIVERS_PAGE_SEASON = 2026;

// Driver portraits are served from the client's own /public/drivers folder,
// keyed by car number, rather than OpenF1's headshot_url.
function localDriverImage(driverNumber: number) {
  return `/drivers/${driverNumber}.png`;
}

// Person and seat live in different documents now, so this recomposes the flat
// shape the Drivers page has always consumed. DriverEntry is an internal
// detail — the API surface is unchanged.
function serialiseEntry(entry: any) {
  const driver = entry.driver;

  return {
    driverNumber: entry.driverNumber,
    firstName: driver.firstName,
    lastName: driver.lastName,
    fullName:
      driver.fullName ?? `${driver.firstName} ${driver.lastName}`.trim(),
    acronym: driver.acronym,
    team: entry.team?.name ?? null,
    teamColour: entry.team?.color ?? "#666666",
    // DriverCard falls back to this if the <img> errors, so pointing it at the
    // local render keeps OpenF1 images out of the page entirely.
    headshotUrl: localDriverImage(entry.driverNumber),
    countryCode: driver.nationality ?? null,
  };
}

// The grid for a season. Without one, a driver who changed numbers between
// seasons would appear twice with no way to tell which entry is current.
export async function getAllDrivers(season: number) {
  const entries = await DriverEntry.find({ season })
    .populate("driver")
    .populate("team")
    .sort({ driverNumber: 1 })
    .lean();

  return entries.filter((entry: any) => entry.driver).map(serialiseEntry);
}

// Drivers who actually took part in a given race, via their results.
export async function getDrivers(sessionKey: number) {
  const race: any = await Race.findOne(
    { sessionKey },
    { _id: 1, season: 1 }
  ).lean();

  if (!race) {
    throw new Error(
      `Session ${sessionKey} has not been ingested. Run the season ingest first.`
    );
  }

  const driverIds = await RaceResult.distinct("driver", { race: race._id });

  const entries = await DriverEntry.find({
    season: race.season,
    driver: { $in: driverIds },
  })
    .populate("driver")
    .populate("team")
    .sort({ driverNumber: 1 })
    .lean();

  return entries.filter((entry: any) => entry.driver).map(serialiseEntry);
}

export async function getDriver(sessionKey: number, driverNumber: number) {
  const drivers = await getDrivers(sessionKey);

  return drivers.find((driver) => driver.driverNumber === driverNumber) ?? null;
}
