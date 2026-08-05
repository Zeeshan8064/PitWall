import mongoose from "mongoose";
import { OpenF1Driver } from "../types";

// OpenF1's country_code is null for most drivers — all 22 of the 2026 grid —
// so we fill it in ourselves. Keyed by car number, using IOC-style 3-letter
// codes, and reflecting the CURRENT (2026) grid: #1 is the reigning champion.
//
// Note this is keyed by number, so it is only correct for the latest season.
// It is a fallback for nationality only; identity comes from the acronym.
export const DRIVER_COUNTRIES: Record<number, string> = {
  1: "GBR",  // Lando Norris (World Champion)
  3: "NED",  // Max Verstappen
  5: "BRA",  // Gabriel Bortoleto
  6: "FRA",  // Isack Hadjar
  10: "FRA", // Pierre Gasly
  11: "MEX", // Sergio Perez
  12: "ITA", // Andrea Kimi Antonelli
  14: "ESP", // Fernando Alonso
  16: "MON", // Charles Leclerc
  18: "CAN", // Lance Stroll
  23: "THA", // Alexander Albon
  27: "GER", // Nico Hülkenberg
  30: "NZL", // Liam Lawson
  31: "FRA", // Esteban Ocon
  41: "GBR", // Arvid Lindblad
  43: "ARG", // Franco Colapinto
  44: "GBR", // Lewis Hamilton
  55: "ESP", // Carlos Sainz
  63: "GBR", // George Russell
  77: "FIN", // Valtteri Bottas
  81: "AUS", // Oscar Piastri
  87: "GBR", // Oliver Bearman
};

// The season DRIVER_COUNTRIES describes. The table is keyed by car number, and
// numbers are reassigned between seasons, so applying it to an older season
// would attribute the wrong nationality — #1 is Norris in 2026 but Verstappen
// in 2025. Nationality is a property of the person, so it only has to be
// resolved once; syncDrivers will not overwrite a known value with null.
export const CURRENT_GRID_SEASON = 2026;

// The person. Nothing season-dependent belongs here — see mapDriverEntry.
export function mapDriver(driver: OpenF1Driver, season: number) {
  const [fallbackFirst, ...fallbackRest] = (driver.full_name ?? "").split(" ");

  const nationality =
    driver.country_code ??
    (season === CURRENT_GRID_SEASON
      ? DRIVER_COUNTRIES[driver.driver_number]
      : undefined) ??
    null;

  return {
    acronym: driver.name_acronym,
    firstName: driver.first_name ?? fallbackFirst ?? "",
    lastName: driver.last_name ?? fallbackRest.join(" "),
    fullName: driver.full_name,
    nationality,
    headshotUrl: driver.headshot_url,
  };
}

// The seat: which number and team this person had in a given season.
export function mapDriverEntry(
  driver: OpenF1Driver,
  driverId: mongoose.Types.ObjectId,
  teamId: mongoose.Types.ObjectId,
  season: number
) {
  return {
    driver: driverId,
    season,
    driverNumber: driver.driver_number,
    team: teamId,
  };
}
