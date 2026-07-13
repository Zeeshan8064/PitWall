import { OpenF1Driver } from "../types";

export function mapDriver(driver: OpenF1Driver) {
  return {
    driverNumber: driver.driver_number,
    fullName: driver.full_name,
    acronym: driver.name_acronym,
    team: driver.team_name,
    teamColour: `#${driver.team_colour}`,
    headshotUrl: driver.headshot_url,
  };
}