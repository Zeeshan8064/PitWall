import mongoose from "mongoose";
import { OpenF1Meeting, OpenF1Session } from "../types";

// A Race document joins the race *session* (which carries session_key and the
// actual race window) with its *meeting* (which carries the official name).
//
// `round` has no OpenF1 source and is supplied by the caller — see
// assignRounds in meetingMapper.
export function mapRace(
  session: OpenF1Session,
  meeting: OpenF1Meeting,
  circuitId: mongoose.Types.ObjectId,
  round: number
) {
  return {
    sessionKey: session.session_key,
    meetingKey: session.meeting_key,
    season: session.year,
    round,
    officialName: meeting.meeting_official_name,
    meetingName: meeting.meeting_name,
    circuit: circuitId,
    startDate: new Date(session.date_start),
    endDate: new Date(session.date_end),
  };
}
