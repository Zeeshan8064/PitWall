import { OpenF1Session } from "../types";

export function mapSession(session: OpenF1Session) {
  return {
    sessionKey: session.session_key,
    meetingKey: session.meeting_key,
    sessionName: session.session_name,
    sessionType: session.session_type,
    // `location` is the city, which is what the UI shows as the race name
    // until meeting data (with the official name) is ingested.
    raceName: session.location,
    circuit: session.circuit_short_name,
    circuitKey: session.circuit_key,
    country: session.country_name,
    countryCode: session.country_code,
    date: session.date_start,
    dateEnd: session.date_end,
    year: session.year,
    isCancelled: session.is_cancelled,
  };
}
