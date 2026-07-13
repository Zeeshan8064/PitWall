import { OpenF1Session } from "../types";

export function mapSession(session: OpenF1Session) {
  return {
    sessionKey: session.session_key,
    raceName: session.location,
    circuit: session.circuit_short_name,
    country: session.country_name,
    countryCode: session.country_code,
    date: session.date_start,
    year: session.year,
  };
}