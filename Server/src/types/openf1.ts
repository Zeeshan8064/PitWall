export interface OpenF1Session {
  session_key: number;
  meeting_key: number;
  session_name: string;
  location: string;
  country_name: string;
  country_code: string;
  circuit_short_name: string;
  date_start: string;
  date_end: string;
  year: number;
}

export interface OpenF1Driver {
  driver_number: number;
  full_name: string;
  first_name?: string;
  last_name?: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  headshot_url: string;
  country_code?: string;
}

export interface OpenF1Lap {
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  is_pit_out_lap: boolean;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
}

export interface OpenF1Stint {
  driver_number: number;
  stint_number: number;
  lap_start: number;
  lap_end: number;
  compound: string;
  tyre_age_at_start: number;
}

export interface OpenF1Pit {
  driver_number: number;
  lap_number: number;
  pit_duration: number | null;
}

export interface OpenF1Interval {
  driver_number: number;
  gap_to_leader: number | null;
  interval: number | null;
  date: string;
}

// OpenF1 has no dedicated "starting grid" endpoint. `/position` gives
// driver position samples across the whole session — the earliest
// sample per driver is used as their starting/grid position, and the
// latest sample as their finishing position.
export interface OpenF1Position {
  driver_number: number;
  position: number;
  date: string;
}