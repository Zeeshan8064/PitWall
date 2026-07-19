import { OpenF1Driver } from "../types";

export function mapDriver(driver: OpenF1Driver) {
  // OpenF1 usually returns first_name/last_name directly, but fall back to
  // splitting full_name in case a session's driver record is missing them.
  const [fallbackFirst, ...fallbackRest] = (driver.full_name ?? "").split(" ");

  return {
    driverNumber: driver.driver_number,
    firstName: driver.first_name ?? fallbackFirst ?? "",
    lastName: driver.last_name ?? fallbackRest.join(" "),
    fullName: driver.full_name,
    acronym: driver.name_acronym,
    team: driver.team_name,
    teamColour: driver.team_colour ? `#${driver.team_colour}` : "#666666",
    headshotUrl: driver.headshot_url,
    countryCode: driver.country_code ?? null,
  };
}