// Client-side simulation against the model fitted on the server. Kept here
// rather than on the API so editing a strategy recomputes instantly instead of
// costing a round trip per keystroke.

export interface CompoundModel {
  compound: string;
  offset: number;
  degPerLap: number;
  fuelPerLap: number;
  samples: number;
  r2: number;
}

export interface ActualStrategy {
  driverNumber: number | null;
  acronym: string;
  lastName: string;
  finishPosition: number;
  status: string;
  // That driver's own median green-flag lap.
  baseline: number;
  finishTime: number | null;
  gapToLeader: number | string | null;
  stints: { compound: string; lapStart: number; lapEnd: number }[];
}

export interface StrategyModel {
  sessionKey: number;
  season: number;
  round: number;
  raceName: string;
  circuit: string | null;
  raceLaps: number;
  referencePace: number;
  pitLossSeconds: number;
  pitLossSamples: number;
  compounds: CompoundModel[];
  actual: ActualStrategy[];
}

export interface Stint {
  compound: string;
  laps: number;
}

// A stint's total time in closed form. Summing lap by lap is the obvious
// implementation, but the optimiser evaluates tens of thousands of candidate
// strategies and this turns each one from O(laps) into O(stints).
//
//   lap time = pace + offset + deg * tyreAge + fuel * lapNumber
//
// so over n laps starting at `startLap`, with tyre age running 0..n-1:
//
//   n(pace + offset) + deg * n(n-1)/2 + fuel * (n * startLap + n(n-1)/2)
function stintSeconds(
  pace: number,
  compound: CompoundModel,
  startLap: number,
  laps: number
) {
  if (laps <= 0) return 0;

  const triangular = (laps * (laps - 1)) / 2;

  return (
    laps * (pace + compound.offset) +
    compound.degPerLap * triangular +
    compound.fuelPerLap * (laps * startLap + triangular)
  );
}

export interface SimulationResult {
  totalSeconds: number;
  stops: number;
  // Cumulative lap times, for charting.
  lapTimes: { lap: number; time: number; compound: string; age: number }[];
  valid: boolean;
  problem?: string;
}

// `pace` is the car's median green-flag lap. Defaults to the reference (the
// quickest in the field); pass a driver's own baseline to time their strategy
// in their car rather than in the fastest one.
export function simulate(
  model: StrategyModel,
  stints: Stint[],
  pace?: number
): SimulationResult {
  const carPace = pace ?? model.referencePace;
  const byCompound = new Map(model.compounds.map((c) => [c.compound, c]));

  const totalLaps = stints.reduce((sum, s) => sum + s.laps, 0);

  if (stints.length === 0) {
    return { totalSeconds: 0, stops: 0, lapTimes: [], valid: false, problem: "No stints" };
  }

  if (totalLaps !== model.raceLaps) {
    return {
      totalSeconds: 0,
      stops: 0,
      lapTimes: [],
      valid: false,
      problem: `Stints total ${totalLaps} laps, race is ${model.raceLaps}`,
    };
  }

  // A dry race requires at least two different compounds. Enforced because a
  // single-compound plan is otherwise always fastest, and would be illegal.
  if (new Set(stints.map((s) => s.compound)).size < 2) {
    return {
      totalSeconds: 0,
      stops: 0,
      lapTimes: [],
      valid: false,
      problem: "Must use at least two different compounds",
    };
  }

  let total = 0;
  let lap = 1;
  const lapTimes: SimulationResult["lapTimes"] = [];

  for (const stint of stints) {
    const compound = byCompound.get(stint.compound);

    if (!compound) {
      return {
        totalSeconds: 0,
        stops: 0,
        lapTimes: [],
        valid: false,
        problem: `No model for ${stint.compound} at this circuit`,
      };
    }

    for (let age = 0; age < stint.laps; age++) {
      const time =
        carPace +
        compound.offset +
        compound.degPerLap * age +
        compound.fuelPerLap * lap;

      lapTimes.push({ lap, time, compound: stint.compound, age });
      lap++;
    }

    total += stintSeconds(carPace, compound, lap - stint.laps, stint.laps);
  }

  const stops = stints.length - 1;

  return {
    totalSeconds: total + stops * model.pitLossSeconds,
    stops,
    lapTimes,
    valid: true,
  };
}

// Shortest stint worth modelling. Below this the fit is extrapolating well
// past anything in the data.
const MIN_STINT = 5;

// Exhaustive search over stop laps and compound choices for a given number of
// stops. Closed-form stint timing keeps this fast enough to run on every
// render without a worker.
export function findOptimal(model: StrategyModel, stops: number): Stint[] | null {
  const compounds = model.compounds.map((c) => c.compound);

  if (compounds.length < 2) return null;

  const stintCount = stops + 1;
  const byCompound = new Map(model.compounds.map((c) => [c.compound, c]));

  let best: { stints: Stint[]; time: number } | null = null;

  const evaluate = (lengths: number[], choice: string[]) => {
    if (new Set(choice).size < 2) return;

    let total = 0;
    let lap = 1;

    for (let i = 0; i < lengths.length; i++) {
      const compound = byCompound.get(choice[i])!;
      total += stintSeconds(model.referencePace, compound, lap, lengths[i]);
      lap += lengths[i];
    }

    total += stops * model.pitLossSeconds;

    if (!best || total < best.time) {
      best = {
        time: total,
        stints: lengths.map((laps, i) => ({ compound: choice[i], laps })),
      };
    }
  };

  const compoundSets: string[][] = [];
  const buildChoices = (current: string[]) => {
    if (current.length === stintCount) {
      compoundSets.push([...current]);
      return;
    }
    for (const c of compounds) buildChoices([...current, c]);
  };
  buildChoices([]);

  const splitLengths = (remaining: number, parts: number, acc: number[]) => {
    if (parts === 1) {
      if (remaining >= MIN_STINT) {
        for (const choice of compoundSets) evaluate([...acc, remaining], choice);
      }
      return;
    }

    for (let n = MIN_STINT; n <= remaining - MIN_STINT * (parts - 1); n++) {
      splitLengths(remaining - n, parts - 1, [...acc, n]);
    }
  };

  splitLengths(model.raceLaps, stintCount, []);

  return best ? (best as { stints: Stint[] }).stints : null;
}

// Converts a real driver's stints into the simulator's own representation, so
// their plan can be timed by the same model as yours.
export function stintsFromActual(actual: ActualStrategy): Stint[] {
  return actual.stints.map((s) => ({
    compound: s.compound,
    laps: s.lapEnd - s.lapStart + 1,
  }));
}

export interface PredictedRow {
  key: string;
  label: string;
  detail: string;
  seconds: number;
  isYou: boolean;
  actualPosition: number | null;
}

// Places a projected time among the field, with every car simulated through
// the same model at its own pace.
//
// Deliberately not compared against real finishing times: the projection is
// green-flag only and runs tens of seconds quicker than reality, so inserting
// it into the real classification would put any strategy on pole. Simulating
// everyone makes the comparison like-for-like — the only difference left
// between you and them is the strategy and the car pace you chose.
export function predictFinish(
  model: StrategyModel,
  stints: Stint[],
  pace: number
): { rows: PredictedRow[]; position: number | null } {
  const rows: PredictedRow[] = [];

  for (const driver of model.actual) {
    const sim = simulate(
      model,
      stintsFromActual(driver),
      driver.baseline
    );

    if (!sim.valid) continue;

    rows.push({
      key: driver.acronym,
      label: driver.lastName,
      detail: driver.stints
        .map((s) => `${s.compound[0]}${s.lapEnd - s.lapStart + 1}`)
        .join(" / "),
      seconds: sim.totalSeconds,
      isYou: false,
      actualPosition: driver.finishPosition,
    });
  }

  const you = simulate(model, stints, pace);

  if (you.valid) {
    rows.push({
      key: "__you",
      label: "You",
      detail: stints.map((s) => `${s.compound[0]}${s.laps}`).join(" / "),
      seconds: you.totalSeconds,
      isYou: true,
      actualPosition: null,
    });
  }

  rows.sort((a, b) => a.seconds - b.seconds);

  const position = you.valid
    ? rows.findIndex((row) => row.isYou) + 1
    : null;

  return { rows, position };
}

export function formatRaceTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  return `${hours}:${String(minutes).padStart(2, "0")}:${rest
    .toFixed(1)
    .padStart(4, "0")}`;
}

export function formatDelta(seconds: number) {
  if (!Number.isFinite(seconds)) return "—";

  const sign = seconds > 0 ? "+" : seconds < 0 ? "−" : "";

  return `${sign}${Math.abs(seconds).toFixed(1)}s`;
}
