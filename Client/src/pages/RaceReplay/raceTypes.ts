export interface RaceMeta {
  sessionKey: number;
  meetingKey?: number;
  round?: number;
  raceName: string;
  circuit: string;
  country: string;
  countryCode: string;
  date: string;
}

export type SessionGroup = "grandPrix" | "sprint";

export interface SessionSummary {
  sessionKey: number;
  sessionType: string;
  // Display name — "Sprint Race" rather than OpenF1's "Sprint".
  label: string;
  group: SessionGroup;
  date: string;
  isFuture: boolean;
}

export interface MeetingMeta {
  meetingKey: number;
  season: number;
  round: number;
  raceName: string;
  officialName: string;
  circuit: string | null;
  location: string | null;
  country: string | null;
  // Traced SVG path for the circuit, or null if it has not been generated.
  circuitOutline: string | null;
  date: string;
}

// What the weekend actually contains, as read from the database. A sprint
// weekend is one whose sprint group is non-empty — the frontend never carries
// a list of which rounds those are.
export interface SessionContext {
  meeting: MeetingMeta;
  isSprintWeekend: boolean;
  groups: Record<SessionGroup, SessionSummary[]>;
  selected: SessionSummary | null;
}

export interface Driver {
  driverNumber: number;
  // Returned by /drivers alongside fullName; surname alone reads better on a
  // stat card than a full name that wraps.
  firstName: string;
  lastName: string;
  fullName: string;
  acronym: string;
  team: string;
  teamColour: string;
  headshotUrl: string;
}

export interface Lap {
  driverNumber: number;
  lapNumber: number;
  lapDuration: number | null;
  isPitOutLap: boolean;
  sector1: number | null;
  sector2: number | null;
  sector3: number | null;
  // Speed trap reading, the only straightline-speed measure in the model.
  stSpeed?: number | null;
}

export interface Stint {
  driverNumber: number;
  stintNumber: number;
  lapStart: number;
  lapEnd: number;
  compound: string;
  tyreAgeAtStart: number;
}

export interface Pitstop {
  driverNumber: number;
  lapNumber: number;
  pitDuration: number | null;
}

export interface IntervalRow {
  driverNumber: number;
  gapToLeader: number | string | null;
  interval: number | string | null;
  date: string;
}

export interface PositionRow {
  driverNumber: number;
  position: number;
  date: string;
}

export interface RaceData {
  drivers: Driver[];
  laps: Lap[];
  stints: Stint[];
  pitstops: Pitstop[];
  intervals: IntervalRow[];
  positions: PositionRow[];
}

export interface ClassificationRow {
  driver: Driver | undefined;
  driverNumber: number;
  finishPosition: number | null;
  startPosition: number | null;
  gapToLeader: number | string | null;
  currentCompound: string | null;
}