import { Race } from "../models";

// Every OpenF1-facing identifier is a session_key, but the models reference
// races by ObjectId. This is the single translation point between the two.
export async function getRaceIdBySessionKey(sessionKey: number) {
  const race: any = await Race.findOne({ sessionKey }, { _id: 1 }).lean();

  return race ? race._id : null;
}

export async function requireRaceIdBySessionKey(sessionKey: number) {
  const raceId = await getRaceIdBySessionKey(sessionKey);

  if (!raceId) {
    throw new Error(
      `Session ${sessionKey} has not been ingested. Run the season ingest first.`
    );
  }

  return raceId;
}
