import mongoose from "mongoose";

import { normaliseSessionType, SESSION_TYPES } from "../constants";
import { OpenF1Meeting, OpenF1Session } from "../types";

// A Race document joins a *session* (which carries session_key and the actual
// session window) with its *meeting* (which carries the official name). Every
// session of a weekend produces one, distinguished by sessionType.
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
    // Callers filter to replay session types before mapping, so the fallback
    // is unreachable in practice — it exists to keep the field non-null.
    sessionType:
      normaliseSessionType(session.session_name) ?? SESSION_TYPES.RACE,
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
