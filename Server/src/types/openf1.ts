// Shapes returned by the OpenF1 v1 API (https://api.openf1.org/v1).
//
// These interfaces describe what the API *actually* sends, not the subset we
// happen to use today. Narrowing them causes fields to be silently dropped in
// the mappers, which is how `lane_duration` went missing.
//
// Every collection endpoint echoes `meeting_key` and `session_key` back, so
// that pair is factored out here.
interface OpenF1Keys {
  meeting_key: number;
  session_key: number;
}

export interface OpenF1Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_key: number;
  country_code: string;
  country_name: string;
  country_flag: string;
  circuit_key: number;
  circuit_short_name: string;
  circuit_type: string;
  circuit_info_url: string | null;
  circuit_image: string | null;
  gmt_offset: string;
  date_start: string;
  date_end: string;
  year: number;
  is_cancelled: boolean;
}

export interface OpenF1Session extends OpenF1Keys {
  session_name: string;
  session_type: string;
  location: string;
  country_key: number;
  country_name: string;
  country_code: string;
  circuit_key: number;
  circuit_short_name: string;
  gmt_offset: string;
  date_start: string;
  date_end: string;
  year: number;
  is_cancelled: boolean;
}

export interface OpenF1Driver extends OpenF1Keys {
  driver_number: number;
  full_name: string;
  broadcast_name: string;
  first_name: string | null;
  last_name: string | null;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  headshot_url: string;
  // Frequently null in practice — see DRIVER_COUNTRIES in driverMapper.
  country_code: string | null;
}

export interface OpenF1Lap extends OpenF1Keys {
  driver_number: number;
  lap_number: number;
  date_start: string | null;
  lap_duration: number | null;
  is_pit_out_lap: boolean;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  i1_speed: number | null;
  i2_speed: number | null;
  st_speed: number | null;
  segments_sector_1: (number | null)[];
  segments_sector_2: (number | null)[];
  segments_sector_3: (number | null)[];
}

export interface OpenF1Stint extends OpenF1Keys {
  driver_number: number;
  stint_number: number;
  lap_start: number;
  lap_end: number;
  compound: string;
  tyre_age_at_start: number;
}

export interface OpenF1Pit extends OpenF1Keys {
  driver_number: number;
  lap_number: number;
  date: string;
  // Total time between pit entry and exit.
  lane_duration: number | null;
  // Historically the same value as lane_duration.
  pit_duration: number | null;
  // Stationary time in the box only.
  stop_duration: number | null;
}

// NOTE: /position carries no lap_number — it is a timestamped feed. Lap
// attribution has to be derived by joining against lap date_start values.
export interface OpenF1Position extends OpenF1Keys {
  driver_number: number;
  position: number;
  date: string;
}

// Car position on track, sampled at roughly 3.7Hz. x/y/z are in decimetres on
// a circuit-local grid — good for tracing a shape, not georeferenced.
//
// Never stored: ingest reduces a single lap of these to one SVG path and
// discards the samples. See utils/trackOutline.
export interface OpenF1Location extends OpenF1Keys {
  driver_number: number;
  date: string;
  x: number | null;
  y: number | null;
  z: number | null;
}

// gap_to_leader / interval are numeric seconds for cars on the lead lap, but
// become strings such as "+1 LAP" once a car is lapped.
export interface OpenF1Interval extends OpenF1Keys {
  driver_number: number;
  gap_to_leader: number | string | null;
  interval: number | string | null;
  date: string;
}

// Final classification for a session. Supplies points and retirement flags
// directly, so none of it needs to be derived from position data.
export interface OpenF1SessionResult extends OpenF1Keys {
  driver_number: number;
  position: number | null;
  number_of_laps: number | null;
  points: number | null;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  gap_to_leader: number | string | null;
  duration: number | number[] | null;
}

export interface OpenF1ChampionshipDriver extends OpenF1Keys {
  driver_number: number;
  position_start: number;
  position_current: number;
  points_start: number;
  points_current: number;
}

// Keyed by team_name — there is no team id in the OpenF1 model.
export interface OpenF1ChampionshipTeam extends OpenF1Keys {
  team_name: string;
  position_start: number;
  position_current: number;
  points_start: number;
  points_current: number;
}
