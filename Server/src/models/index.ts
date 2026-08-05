// Importing this barrel registers every schema with mongoose, which `ref`
// resolution and populate() depend on.
export { default as Circuit } from "./Circuit";
export { default as ConstructorsChampionship } from "./ConstructorsChampionship";
export { default as Driver } from "./Driver";
export { default as DriverChampionship } from "./DriverChampionship";
export { default as DriverEntry } from "./DriverEntry";
export { default as Interval } from "./Interval";
export { default as Lap } from "./Lap";
export { default as PitStop } from "./PitStop";
export { default as Position } from "./Position";
export { default as Race } from "./Race";
export { default as RaceResult } from "./RaceResult";
export { default as Stint } from "./Stint";
export { default as Team } from "./Team";
