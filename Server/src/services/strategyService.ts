import mongoose from "mongoose";

import { SESSION_TYPES } from "../constants";
import { Lap, PitStop, Race, RaceResult, Stint } from "../models";
import { getSeasonEntries } from "./raceLookup";

// Fits a tyre model to a race that actually happened, so the simulator runs on
// that circuit's real degradation rather than invented constants.
//
// The naive fit — lap time against tyre age — returns almost nothing (R² ≈
// 0.02, and soft tyres appearing to get *faster*). Fuel burn makes a car
// quicker at roughly the same rate tyres make it slower, so the two cancel.
// Regressing on tyre age *and* lap number separates them, which is what every
// figure below depends on.

// A lap this far off a driver's own median is traffic, a safety car or an
// error, not representative green-flag running.
const OUTLIER_THRESHOLD = 1.07;

// Below this a compound's fit is noise — usually a set run by one car for a
// handful of laps at the end.
const MIN_SAMPLES = 25;

export interface CompoundModel {
  compound: string;
  // Seconds relative to the reference pace at zero tyre age, lap zero.
  offset: number;
  // Seconds lost per lap of tyre age. The degradation figure.
  degPerLap: number;
  // Seconds gained per lap of race distance as fuel burns off. Negative.
  fuelPerLap: number;
  samples: number;
  r2: number;
}

interface Sample {
  age: number;
  lap: number;
  y: number;
}

// Ordinary least squares on two regressors, solved directly — a 2x2 system
// does not need a matrix library.
function fitTwo(rows: Sample[]) {
  const n = rows.length;

  const meanAge = rows.reduce((s, r) => s + r.age, 0) / n;
  const meanLap = rows.reduce((s, r) => s + r.lap, 0) / n;
  const meanY = rows.reduce((s, r) => s + r.y, 0) / n;

  let sAA = 0;
  let sLL = 0;
  let sAL = 0;
  let sAY = 0;
  let sLY = 0;

  for (const row of rows) {
    const dA = row.age - meanAge;
    const dL = row.lap - meanLap;
    const dY = row.y - meanY;

    sAA += dA * dA;
    sLL += dL * dL;
    sAL += dA * dL;
    sAY += dA * dY;
    sLY += dL * dY;
  }

  const det = sAA * sLL - sAL * sAL;

  if (!det) return null;

  const degPerLap = (sLL * sAY - sAL * sLY) / det;
  const fuelPerLap = (sAA * sLY - sAL * sAY) / det;
  const offset = meanY - degPerLap * meanAge - fuelPerLap * meanLap;

  let ssTot = 0;
  let ssRes = 0;

  for (const row of rows) {
    ssTot += (row.y - meanY) ** 2;
    ssRes += (row.y - (offset + degPerLap * row.age + fuelPerLap * row.lap)) ** 2;
  }

  return {
    offset,
    degPerLap,
    fuelPerLap,
    r2: ssTot ? 1 - ssRes / ssTot : 0,
    samples: n,
  };
}

function median(values: number[]) {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);

  return sorted[Math.floor(sorted.length / 2)];
}

export async function getStrategyModel(sessionKey: number) {
  const race: any = await Race.findOne({ sessionKey })
    .populate("circuit")
    .lean();

  if (!race) {
    throw new Error(
      `Session ${sessionKey} has not been ingested. Run the season ingest first.`
    );
  }

  if ((race.sessionType ?? SESSION_TYPES.RACE) !== SESSION_TYPES.RACE) {
    throw new Error("Strategy modelling only applies to race sessions");
  }

  const [laps, stints, pitstops, results] = await Promise.all([
    Lap.find({ race: race._id }).lean(),
    Stint.find({ race: race._id }).lean(),
    PitStop.find({ race: race._id }).lean(),
    RaceResult.find({ race: race._id }).populate("driver").lean(),
  ]);

  if (laps.length === 0) {
    throw new Error("No lap data for this session");
  }

  const raceLaps = Math.max(...laps.map((lap: any) => lap.lapNumber));

  // ─── Per-driver baselines ─────────────────────────────────────────────────
  // Modelling the delta from each driver's own median removes car and driver
  // pace differences, which would otherwise be read as degradation.
  const stintsByDriver = new Map<string, any[]>();
  for (const stint of stints as any[]) {
    const key = String(stint.driver);
    stintsByDriver.set(key, [...(stintsByDriver.get(key) ?? []), stint]);
  }

  const baseline = new Map<string, number>();
  for (const [driver] of stintsByDriver) {
    const times = (laps as any[])
      .filter(
        (lap) =>
          String(lap.driver) === driver && lap.lapDuration && !lap.isPitOutLap
      )
      .map((lap) => lap.lapDuration);

    const value = median(times);
    if (value && times.length > 5) baseline.set(driver, value);
  }

  // The reference car the simulation runs as: the quickest baseline in the
  // field, so a projection is comparable with the winner's real race.
  const referencePace = Math.min(...[...baseline.values()]);

  // ─── Samples ──────────────────────────────────────────────────────────────
  const samples: Record<string, Sample[]> = {};

  for (const lap of laps as any[]) {
    if (!lap.lapDuration || lap.isPitOutLap) continue;

    const base = baseline.get(String(lap.driver));
    if (!base || lap.lapDuration > base * OUTLIER_THRESHOLD) continue;

    const stint = (stintsByDriver.get(String(lap.driver)) ?? []).find(
      (s) => lap.lapNumber >= s.lapStart && lap.lapNumber <= s.lapEnd
    );

    if (!stint?.compound) continue;

    (samples[stint.compound] ??= []).push({
      age: lap.lapNumber - stint.lapStart + (stint.tyreAgeAtStart ?? 0),
      lap: lap.lapNumber,
      y: lap.lapDuration - base,
    });
  }

  const compounds: CompoundModel[] = [];

  for (const [compound, rows] of Object.entries(samples)) {
    if (rows.length < MIN_SAMPLES) continue;

    const fit = fitTwo(rows);
    if (!fit) continue;

    compounds.push({ compound, ...fit });
  }

  // Softest first, which is the order a strategy is usually reasoned about.
  const ORDER = ["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"];
  compounds.sort(
    (a, b) => ORDER.indexOf(a.compound) - ORDER.indexOf(b.compound)
  );

  // ─── Pit loss ─────────────────────────────────────────────────────────────
  // Time actually lost, not just the stationary time: the in-lap and out-lap
  // excess over that driver's normal lap captures the pit lane too.
  const losses: number[] = [];

  for (const stop of pitstops as any[]) {
    const base = baseline.get(String(stop.driver));
    if (!base) continue;

    const inLap = (laps as any[]).find(
      (l) => String(l.driver) === String(stop.driver) && l.lapNumber === stop.lap
    );
    const outLap = (laps as any[]).find(
      (l) =>
        String(l.driver) === String(stop.driver) && l.lapNumber === stop.lap + 1
    );

    if (!inLap?.lapDuration || !outLap?.lapDuration) continue;

    const loss = inLap.lapDuration + outLap.lapDuration - 2 * base;

    // Anything outside this band is a stop that coincided with something else
    // — a safety car, a penalty served, or a lap that was itself abnormal.
    if (loss > 5 && loss < 60) losses.push(loss);
  }

  // ─── What the field actually did ──────────────────────────────────────────
  // Keyed off driver._id, not driver: these documents are populated, so the
  // field holds the Driver document and String() on it yields "[object
  // Object]" rather than an id.
  const resultByDriver = new Map(
    (results as any[])
      .filter((r) => r.driver)
      .map((r) => [String(r.driver._id), r])
  );

  // Car numbers live on DriverEntry rather than Driver.
  const { numberByDriverId } = await getSeasonEntries(race.season);

  const actual = [...stintsByDriver.entries()]
    .map(([driverId, driverStints]) => {
      const result = resultByDriver.get(driverId);

      if (!result?.driver || result.finishPosition === null) return null;

      return {
        driverNumber: numberByDriverId.get(driverId) ?? null,
        acronym: result.driver.acronym,
        lastName: result.driver.lastName,
        finishPosition: result.finishPosition,
        status: result.status,
        // That driver's own median green-flag lap. Simulating each car at its
        // own pace is what makes a predicted finishing position meaningful:
        // running the whole field at the reference pace would compare
        // strategies only, and every gap would collapse.
        baseline: baseline.get(driverId) ?? null,
        // The real result, for calibration against the projection.
        finishTime: result.finishTime ?? null,
        gapToLeader: result.gapToLeader ?? null,
        stints: [...driverStints]
          .sort((a, b) => a.stintNumber - b.stintNumber)
          .filter((s) => s.compound)
          .map((s) => ({
            compound: s.compound,
            lapStart: s.lapStart,
            lapEnd: s.lapEnd,
          })),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .filter((row) => row.baseline !== null && row.stints.length > 0)
    .sort((a, b) => a.finishPosition - b.finishPosition);

  // Individual stops, for ranking pit crew performance. Cheap to include and
  // saves the strategy page a second, much heavier race-data request.
  const stops = (pitstops as any[])
    .map((stop) => ({
      driverNumber: numberByDriverId.get(String(stop.driver)) ?? null,
      acronym: resultByDriver.get(String(stop.driver))?.driver?.acronym ?? null,
      lap: stop.lap,
      duration: stop.pitDuration ?? stop.laneDuration ?? null,
    }))
    .filter((stop) => stop.duration !== null && stop.acronym !== null)
    .sort((a, b) => (a.duration as number) - (b.duration as number));

  return {
    sessionKey,
    season: race.season,
    round: race.round,
    raceName: race.meetingName,
    circuit: race.circuit?.name ?? null,
    raceLaps,
    referencePace,
    pitLossSeconds: median(losses) ?? 22,
    pitLossSamples: losses.length,
    compounds,
    // The full classified field, not just the top ten — a predicted finishing
    // position needs everyone to place against.
    actual,
    stops,
  };
}
