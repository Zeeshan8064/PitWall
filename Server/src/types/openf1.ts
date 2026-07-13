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
  name_acronym: string;
  team_name: string;
  team_colour: string;
  headshot_url: string;
}

export interface OpenF1Lap {
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  is_pit_out_lap: boolean;
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