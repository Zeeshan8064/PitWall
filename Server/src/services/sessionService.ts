import {
  SESSION_GROUPS,
  SESSION_META,
  SESSION_TYPES,
  SessionGroup,
} from "../constants";
import { Race } from "../models";

// The Meeting -> Available Sessions -> Selected Session layer that Race Replay
// is built on. Which sessions a weekend has is read from the database, so a
// sprint weekend is simply one whose sprint group is non-empty — nothing here
// knows which rounds those are.

interface SessionSummary {
  sessionKey: number;
  sessionType: string;
  label: string;
  group: SessionGroup;
  date: Date;
  isFuture: boolean;
}

function serialiseSession(race: any): SessionSummary {
  const meta = SESSION_META[race.sessionType] ?? SESSION_META[SESSION_TYPES.RACE];

  return {
    sessionKey: race.sessionKey,
    sessionType: race.sessionType ?? SESSION_TYPES.RACE,
    label: meta.label,
    group: meta.group,
    date: race.startDate,
    // A session in the future has no data to replay, and the page needs to say
    // so rather than render an empty classification.
    isFuture: new Date(race.startDate) > new Date(),
  };
}

function sortSessions(sessions: SessionSummary[]) {
  return [...sessions].sort((a, b) => {
    const orderA = SESSION_META[a.sessionType]?.order ?? 99;
    const orderB = SESSION_META[b.sessionType]?.order ?? 99;

    return orderA - orderB;
  });
}

async function loadMeetingSessions(meetingKey: number) {
  const races: any[] = await Race.find({ meetingKey })
    .populate("circuit")
    .lean();

  if (races.length === 0) {
    throw new Error(
      `Meeting ${meetingKey} has not been ingested. Run the season ingest first.`
    );
  }

  const sessions = races.map(serialiseSession);

  const groups = {
    [SESSION_GROUPS.GRAND_PRIX]: sortSessions(
      sessions.filter((s) => s.group === SESSION_GROUPS.GRAND_PRIX)
    ),
    [SESSION_GROUPS.SPRINT]: sortSessions(
      sessions.filter((s) => s.group === SESSION_GROUPS.SPRINT)
    ),
  };

  // Meeting fields repeat across the weekend's sessions, so any document
  // carries them. Prefer the race for its round number being canonical.
  const source =
    races.find((race) => (race.sessionType ?? SESSION_TYPES.RACE) === SESSION_TYPES.RACE) ??
    races[0];

  return {
    meeting: {
      meetingKey: source.meetingKey,
      season: source.season,
      round: source.round,
      raceName: source.meetingName,
      officialName: source.officialName,
      circuit: source.circuit?.name ?? null,
      location: source.circuit?.location ?? null,
      country: source.circuit?.country ?? null,
      circuitOutline: source.circuit?.outlinePath ?? null,
      date: source.startDate,
    },
    // Derived, never hardcoded: a weekend is a sprint weekend precisely when
    // the database holds sprint sessions for it.
    isSprintWeekend: groups[SESSION_GROUPS.SPRINT].length > 0,
    groups,
  };
}

export async function getMeetingSessions(meetingKey: number) {
  return loadMeetingSessions(meetingKey);
}

// Everything the replay page needs for one session key in a single request:
// the weekend it belongs to, its sibling sessions, and which one is selected.
// Resolving from the session key means a deep link to any session works.
export async function getSessionContext(sessionKey: number) {
  const race: any = await Race.findOne({ sessionKey }, { meetingKey: 1 }).lean();

  if (!race) {
    throw new Error(
      `Session ${sessionKey} has not been ingested. Run the season ingest first.`
    );
  }

  const context = await loadMeetingSessions(race.meetingKey);

  const all = [
    ...context.groups[SESSION_GROUPS.GRAND_PRIX],
    ...context.groups[SESSION_GROUPS.SPRINT],
  ];

  return {
    ...context,
    selected: all.find((session) => session.sessionKey === sessionKey) ?? null,
  };
}
