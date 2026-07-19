export interface RaceMeta {
  sessionKey: number;
  round?: number;
  raceName: string;
  circuit: string;
  country: string;
  countryCode: string;
  date: string;
}

export interface Driver {
  driverNumber: number;
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