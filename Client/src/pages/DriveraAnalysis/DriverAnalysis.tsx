import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { formatLapTime, formatSectorTime } from "../RaceReplay/F1utils";
import type { Driver, Lap } from "../RaceReplay/raceTypes";

const API_BASE = "http://localhost:5000";
const SEASONS = [2026, 2025, 2024];

// A lap this far off a driver's own median is traffic or a mistake, not
// representative pace. Same threshold the server's tyre model uses.
const OUTLIER = 1.07;

interface RaceOption {
  sessionKey: number;
  round: number;
  raceName: string;
  date: string;
}

interface Summary {
  best: number | null;
  median: number | null;
  consistency: number | null;
  cleanLaps: number;
  sectors: [number | null, number | null, number | null];
}

function summarise(laps: Lap[]): Summary {
  const times = laps
    .filter((l) => l.lapDuration != null && !l.isPitOutLap)
    .map((l) => l.lapDuration as number)
    .sort((a, b) => a - b);

  if (times.length === 0) {
    return { best: null, median: null, consistency: null, cleanLaps: 0, sectors: [null, null, null] };
  }

  const median = times[Math.floor(times.length / 2)];
  const clean = times.filter((t) => t <= median * OUTLIER);

  const mean = clean.reduce((s, t) => s + t, 0) / clean.length;
  const variance =
    clean.reduce((s, t) => s + (t - mean) ** 2, 0) / Math.max(clean.length, 1);

  const bestSector = (key: "sector1" | "sector2" | "sector3") => {
    const values = laps
      .map((l) => l[key])
      .filter((v): v is number => v != null && v > 0);

    return values.length ? Math.min(...values) : null;
  };

  return {
    best: times[0],
    median,
    consistency: Math.sqrt(variance),
    cleanLaps: clean.length,
    sectors: [bestSector("sector1"), bestSector("sector2"), bestSector("sector3")],
  };
}

export default function DriverAnalysis() {
  const [season, setSeason] = useState(SEASONS[1]);
  const [races, setRaces] = useState<RaceOption[]>([]);
  const [sessionKey, setSessionKey] = useState<number | null>(null);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [left, setLeft] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    axios
      .get(`${API_BASE}/api/races/season/${season}`)
      .then((res) => {
        if (cancelled) return;

        const run = (res.data.races ?? []).filter(
          (race: RaceOption) => new Date(race.date) <= new Date()
        );

        setRaces(run);
        setSessionKey(run[run.length - 1]?.sessionKey ?? null);
      })
      .catch(() => !cancelled && setError("Failed to load races"));

    return () => {
      cancelled = true;
    };
  }, [season]);

  useEffect(() => {
    if (!sessionKey) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    axios
      .get(`${API_BASE}/api/races/${sessionKey}/race-data`)
      .then((res) => {
        if (cancelled) return;

        const nextDrivers: Driver[] = res.data.drivers ?? [];

        setDrivers(nextDrivers);
        setLaps(res.data.laps ?? []);

        // Default to a pair of team-mates: same car, so the difference is the
        // driver rather than the machinery. Falls back to the first two.
        const pair = (() => {
          for (const d of nextDrivers) {
            const mate = nextDrivers.find(
              (o) => o.team === d.team && o.driverNumber !== d.driverNumber
            );
            if (mate) return [d.driverNumber, mate.driverNumber];
          }
          return nextDrivers.slice(0, 2).map((d) => d.driverNumber);
        })();

        setLeft(pair[0] ?? null);
        setRight(pair[1] ?? null);
      })
      .catch(() => !cancelled && setError("Failed to load race data"))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  const lapsFor = (n: number | null) =>
    n === null ? [] : laps.filter((l) => l.driverNumber === n);

  const leftDriver = drivers.find((d) => d.driverNumber === left);
  const rightDriver = drivers.find((d) => d.driverNumber === right);

  const leftSummary = useMemo(() => summarise(lapsFor(left)), [laps, left]);
  const rightSummary = useMemo(() => summarise(lapsFor(right)), [laps, right]);

  // Cumulative gap: the running total of per-lap differences. Rising means the
  // left driver is losing time. This is the shape of the race between them.
  const delta = useMemo(() => {
    if (left === null || right === null) return [];

    const byLap = new Map<number, { a?: number; b?: number }>();

    for (const lap of laps) {
      if (lap.lapDuration == null || lap.isPitOutLap) continue;

      const entry = byLap.get(lap.lapNumber) ?? {};

      if (lap.driverNumber === left) entry.a = lap.lapDuration;
      if (lap.driverNumber === right) entry.b = lap.lapDuration;

      byLap.set(lap.lapNumber, entry);
    }

    let running = 0;
    const series: { lap: number; delta: number }[] = [];

    for (const lapNumber of [...byLap.keys()].sort((x, y) => x - y)) {
      const { a, b } = byLap.get(lapNumber)!;
      if (a == null || b == null) continue;

      running += a - b;
      series.push({ lap: lapNumber, delta: running });
    }

    return series;
  }, [laps, left, right]);

  const deltaBounds = useMemo(() => {
    if (delta.length === 0) return { min: -1, max: 1 };

    const values = delta.map((d) => d.delta);
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);
    const pad = Math.max((max - min) * 0.1, 0.5);

    return { min: min - pad, max: max + pad };
  }, [delta]);

  const leftColour = leftDriver?.teamColour ? `#${leftDriver.teamColour}` : "#e00400";
  const rightColour = rightDriver?.teamColour ? `#${rightDriver.teamColour}` : "#3b82f6";

  const compare = (
    label: string,
    a: number | null,
    b: number | null,
    format: (v: number) => string,
    lowerIsBetter = true
  ) => {
    const aWins =
      a != null && b != null && (lowerIsBetter ? a < b : a > b);
    const bWins =
      a != null && b != null && (lowerIsBetter ? b < a : b > a);

    return (
      <div
        key={label}
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-neutral-900 py-3 last:border-0"
      >
        <span
          className={`text-right font-mono text-sm tabular-nums ${
            aWins ? "font-bold text-white" : "text-neutral-500"
          }`}
        >
          {a != null ? format(a) : "—"}
        </span>

        <span className="w-40 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">
          {label}
        </span>

        <span
          className={`font-mono text-sm tabular-nums ${
            bWins ? "font-bold text-white" : "text-neutral-500"
          }`}
        >
          {b != null ? format(b) : "—"}
        </span>
      </div>
    );
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0A0A0A] text-white">
        <section className="relative overflow-hidden border-b border-neutral-900">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 56px)",
            }}
          />

          <div className="relative mx-auto max-w-375 px-8 pb-10 pt-20">
            <p className="border-b border-neutral-900 pb-6 font-mono text-[11px] uppercase tracking-[0.4em] text-neutral-500">
              {season}
              <span className="mx-3 text-neutral-700">/</span>
              Head to Head
            </p>

            <h1 className="mt-10 text-6xl font-black uppercase leading-[0.85] tracking-tight md:text-8xl">
              DRIVER ANALYSIS
              <span className="text-red-500">.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-400">
              Two drivers, one race, lap by lap. Defaults to team-mates — the
              same car, so what is left is the driver.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <div className="flex flex-wrap gap-2">
                {SEASONS.map((year) => (
                  <button
                    key={year}
                    onClick={() => setSeason(year)}
                    className={`rounded-xl border px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors duration-200 ${
                      year === season
                        ? "border-red-500 bg-red-500/10 text-white"
                        : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-white"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>

              <select
                value={sessionKey ?? ""}
                onChange={(e) => setSessionKey(Number(e.target.value))}
                className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white focus:border-red-500 focus:outline-none"
              >
                {races.map((race) => (
                  <option key={race.sessionKey} value={race.sessionKey}>
                    R{race.round} · {race.raceName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-375 space-y-8 px-8 pb-24 pt-12">
          {loading && (
            <div className="h-96 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900" />
          )}

          {error && <p className="text-red-400">{error}</p>}

          {!loading && !error && drivers.length > 0 && (
            <>
              {/* Selectors */}
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { value: left, set: setLeft, colour: leftColour, side: "Driver A" },
                  { value: right, set: setRight, colour: rightColour, side: "Driver B" },
                ].map((slot) => (
                  <div
                    key={slot.side}
                    className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
                  >
                    <span
                      className="absolute left-0 top-0 h-full w-[3px]"
                      style={{ backgroundColor: slot.colour }}
                    />
                    <p className="pl-2 font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                      {slot.side}
                    </p>
                    <select
                      value={slot.value ?? ""}
                      onChange={(e) => slot.set(Number(e.target.value))}
                      className="mt-3 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white focus:border-red-500 focus:outline-none"
                    >
                      {drivers.map((d) => (
                        <option key={d.driverNumber} value={d.driverNumber}>
                          {d.driverNumber} · {d.fullName} · {d.team}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Cumulative delta */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.35em] text-neutral-500">
                    Cumulative Gap
                  </h2>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">
                    Above the line · {rightDriver?.acronym} ahead
                  </p>
                </div>

                {delta.length > 1 ? (
                  <svg viewBox="0 0 800 240" className="mt-5 w-full">
                    {(() => {
                      const span = deltaBounds.max - deltaBounds.min || 1;
                      const y = (v: number) =>
                        20 + ((deltaBounds.max - v) / span) * 190;
                      const x = (i: number) =>
                        50 + (i / (delta.length - 1)) * 740;

                      const zeroY = y(0);

                      const line = delta
                        .map(
                          (d, i) =>
                            `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.delta).toFixed(1)}`
                        )
                        .join(" ");

                      return (
                        <>
                          {[deltaBounds.max, 0, deltaBounds.min].map((v, i) => (
                            <g key={i}>
                              <line
                                x1={50}
                                x2={790}
                                y1={y(v)}
                                y2={y(v)}
                                stroke={v === 0 ? "#525252" : "#262626"}
                                strokeWidth={1}
                              />
                              <text
                                x={44}
                                y={y(v) + 3}
                                textAnchor="end"
                                fontSize={9}
                                fill="#737373"
                                fontFamily="ui-monospace, monospace"
                              >
                                {v > 0 ? "+" : ""}
                                {v.toFixed(1)}s
                              </text>
                            </g>
                          ))}

                          <path
                            d={`${line} L ${x(delta.length - 1)} ${zeroY} L ${x(0)} ${zeroY} Z`}
                            fill={leftColour}
                            opacity={0.12}
                          />
                          <path
                            d={line}
                            fill="none"
                            stroke={leftColour}
                            strokeWidth={2}
                            strokeLinejoin="round"
                          />

                          <text
                            x={50}
                            y={232}
                            fontSize={9}
                            fill="#737373"
                            fontFamily="ui-monospace, monospace"
                          >
                            Lap {delta[0].lap}
                          </text>
                          <text
                            x={790}
                            y={232}
                            textAnchor="end"
                            fontSize={9}
                            fill="#737373"
                            fontFamily="ui-monospace, monospace"
                          >
                            Lap {delta[delta.length - 1].lap}
                          </text>
                        </>
                      );
                    })()}
                  </svg>
                ) : (
                  <p className="mt-5 text-neutral-600">
                    Not enough shared green-flag laps to compare these two.
                  </p>
                )}

                <p className="mt-3 border-t border-neutral-900 pt-3 text-[10px] leading-relaxed text-neutral-600">
                  Running total of {leftDriver?.acronym} minus{" "}
                  {rightDriver?.acronym} on every lap both completed without
                  pitting. A rising line means {leftDriver?.acronym} is losing
                  time; a step usually marks a stop on a different lap.
                </p>
              </div>

              {/* Head to head */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-neutral-800 pb-4">
                  <p
                    className="text-right text-xl font-black uppercase"
                    style={{ color: leftColour }}
                  >
                    {leftDriver?.acronym ?? "—"}
                  </p>
                  <p className="w-40 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                    Head to Head
                  </p>
                  <p
                    className="text-xl font-black uppercase"
                    style={{ color: rightColour }}
                  >
                    {rightDriver?.acronym ?? "—"}
                  </p>
                </div>

                <div className="mt-2">
                  {compare("Best Lap", leftSummary.best, rightSummary.best, formatLapTime)}
                  {compare("Median Lap", leftSummary.median, rightSummary.median, formatLapTime)}
                  {compare(
                    "Consistency",
                    leftSummary.consistency,
                    rightSummary.consistency,
                    (v) => `±${v.toFixed(3)}s`
                  )}
                  {compare(
                    "Clean Laps",
                    leftSummary.cleanLaps,
                    rightSummary.cleanLaps,
                    (v) => String(v),
                    false
                  )}
                  {compare("Best S1", leftSummary.sectors[0], rightSummary.sectors[0], formatSectorTime)}
                  {compare("Best S2", leftSummary.sectors[1], rightSummary.sectors[1], formatSectorTime)}
                  {compare("Best S3", leftSummary.sectors[2], rightSummary.sectors[2], formatSectorTime)}
                </div>

                <p className="mt-4 border-t border-neutral-900 pt-3 text-[10px] leading-relaxed text-neutral-600">
                  Consistency is the standard deviation of clean laps — lower is
                  more repeatable. Laps more than 7% off a driver's own median
                  are treated as traffic or a mistake and excluded.
                </p>
              </div>
            </>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
