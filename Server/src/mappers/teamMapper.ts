import { OpenF1Driver } from "../types";

// OpenF1 has no team endpoint — teams are derived from the drivers entered in
// a session, and identified by name since there is no team id.
// team_colour arrives without a leading '#'.
export function mapTeam(driver: OpenF1Driver) {
  return {
    name: driver.team_name,
    color: driver.team_colour ? `#${driver.team_colour}` : null,
  };
}
