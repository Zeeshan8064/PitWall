export const SESSION_TYPES = {
    RACE: "Race",
    QUALIFYING: "Qualifying",
    PRACTICE_1: "Practice 1",
    PRACTICE_2: "Practice 2",
    PRACTICE_3: "Practice 3",
    SPRINT: "Sprint",
    SPRINT_QUALIFYING: "Sprint Qualifying",
} as const;

export type SessionType = (typeof SESSION_TYPES)[keyof typeof SESSION_TYPES];

// The session types Race Replay can render. Practice is deliberately excluded:
// it has no classification, so the replay components would have nothing to show.
export const REPLAY_SESSION_TYPES: SessionType[] = [
  SESSION_TYPES.RACE,
  SESSION_TYPES.QUALIFYING,
  SESSION_TYPES.SPRINT,
  SESSION_TYPES.SPRINT_QUALIFYING,
];

// A weekend splits into two halves in the UI. Which half a session belongs to
// is a property of the session type, not of the weekend — that is what keeps
// sprint weekends from needing to be hardcoded anywhere.
export const SESSION_GROUPS = {
  GRAND_PRIX: "grandPrix",
  SPRINT: "sprint",
} as const;

export type SessionGroup = (typeof SESSION_GROUPS)[keyof typeof SESSION_GROUPS];

interface SessionMeta {
  group: SessionGroup;
  label: string;
  // Ordering within a group. Lower sorts first, so the session a visitor most
  // likely wants leads: Race before Qualifying, Sprint before Sprint Qualifying.
  order: number;

  // Which OpenF1 endpoints are worth requesting for this session type.
  // Measured against the 2025 Shanghai weekend rather than assumed:
  //
  //   endpoint          Race   Qualifying   Sprint   Sprint Qual
  //   /intervals       22207        404      7957        404
  //   /pit                25        101         1         57
  //   /championship_*     20        404        20        404
  //
  // Everything else (laps, stints, position, session_result) returns useful
  // rows for all four, so it is always fetched.
  hasIntervals: boolean;
  hasPitStops: boolean;
  hasChampionship: boolean;
}

export const SESSION_META: Record<string, SessionMeta> = {
  [SESSION_TYPES.RACE]: {
    group: SESSION_GROUPS.GRAND_PRIX,
    label: "Race",
    order: 0,
    hasIntervals: true,
    hasPitStops: true,
    hasChampionship: true,
  },
  [SESSION_TYPES.QUALIFYING]: {
    group: SESSION_GROUPS.GRAND_PRIX,
    label: "Qualifying",
    order: 1,
    // /intervals 404s outright. /pit does return rows, but they are pit *lane*
    // entries between runs, not race pit stops — showing them as stops would
    // misrepresent the session, and nothing in the UI consumes them.
    hasIntervals: false,
    hasPitStops: false,
    hasChampionship: false,
  },
  [SESSION_TYPES.SPRINT]: {
    group: SESSION_GROUPS.SPRINT,
    // OpenF1 calls it "Sprint"; the UI calls it "Sprint Race" to pair with
    // "Sprint Qualifying".
    label: "Sprint Race",
    order: 0,
    hasIntervals: true,
    hasPitStops: true,
    // Standings do exist after a sprint, but every standings query resolves
    // rounds through race sessions, so they would be written and never read.
    hasChampionship: false,
  },
  [SESSION_TYPES.SPRINT_QUALIFYING]: {
    group: SESSION_GROUPS.SPRINT,
    label: "Sprint Qualifying",
    order: 1,
    hasIntervals: false,
    hasPitStops: false,
    hasChampionship: false,
  },
};

// 2023 ran sprint qualifying under the name "Sprint Shootout". Normalising on
// the way in means the stored sessionType is stable across seasons and the
// frontend never has to know the old name existed.
const SESSION_NAME_ALIASES: Record<string, SessionType> = {
  "Sprint Shootout": SESSION_TYPES.SPRINT_QUALIFYING,
};

export function normaliseSessionType(sessionName: string): SessionType | null {
  const aliased = SESSION_NAME_ALIASES[sessionName];

  if (aliased) return aliased;

  const known = REPLAY_SESSION_TYPES.find((type) => type === sessionName);

  return known ?? null;
}

// Documents ingested before sessionType existed have no such field, and those
// are all race sessions. Matching null as well keeps every season-level query
// (stats, standings, the race list) correct in the window between deploying
// this and re-running the ingest.
export const RACE_SESSION_FILTER = {
  sessionType: { $in: [SESSION_TYPES.RACE, null] },
};
