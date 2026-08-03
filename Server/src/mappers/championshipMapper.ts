import mongoose from "mongoose";
import { OpenF1ChampionshipDriver, OpenF1ChampionshipTeam } from "../types";

export function mapDriverChampionship(
  entry: OpenF1ChampionshipDriver,
  raceId: mongoose.Types.ObjectId,
  driverId: mongoose.Types.ObjectId
) {
  return {
    race: raceId,
    driver: driverId,
    pointsStart: entry.points_start,
    pointsCurrent: entry.points_current,
    positionStart: entry.position_start,
    positionCurrent: entry.position_current,
  };
}

// OpenF1 identifies teams by name only, so the caller resolves team_name to a
// Team document before calling this.
export function mapTeamChampionship(
  entry: OpenF1ChampionshipTeam,
  raceId: mongoose.Types.ObjectId,
  teamId: mongoose.Types.ObjectId
) {
  return {
    race: raceId,
    team: teamId,
    pointsStart: entry.points_start,
    pointsCurrent: entry.points_current,
    positionStart: entry.position_start,
    positionCurrent: entry.position_current,
  };
}
