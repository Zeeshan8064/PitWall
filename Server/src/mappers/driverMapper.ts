import mongoose from "mongoose";
import { OpenF1Driver } from "../types";

// OpenF1's country_code is null for most drivers, so we fill it in ourselves.
// Keyed by car number, using IOC-style 3-letter codes.
export const DRIVER_COUNTRIES: Record<number, string> = {
  1: "NED",  // Max Verstappen
  4: "GBR",  // Lando Norris
  5: "BRA",  // Gabriel Bortoleto
  6: "FRA",  // Isack Hadjar
  10: "FRA", // Pierre Gasly
  11: "MEX", // Sergio Perez
  12: "ITA", // Andrea Kimi Antonelli
  14: "ESP", // Fernando Alonso
  16: "MON", // Charles Leclerc
  18: "CAN", // Lance Stroll
  22: "JPN", // Yuki Tsunoda
  23: "THA", // Alexander Albon
  27: "GER", // Nico Hulkenberg
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

export function mapDriver(
  driver: OpenF1Driver,
  teamId: mongoose.Types.ObjectId
) {
  const [fallbackFirst, ...fallbackRest] = (driver.full_name ?? "").split(" ");

  return {
    driverNumber: driver.driver_number,
    firstName: driver.first_name ?? fallbackFirst ?? "",
    lastName: driver.last_name ?? fallbackRest.join(" "),
    abbreviation: driver.name_acronym,
    nationality:
      driver.country_code ?? DRIVER_COUNTRIES[driver.driver_number] ?? null,
    headshotUrl: driver.headshot_url,
    team: teamId,
  };
}
