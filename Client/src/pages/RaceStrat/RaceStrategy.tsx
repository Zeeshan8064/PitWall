import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { formatLapTime } from "../RaceReplay/F1utils";
import { API_BASE } from "../../lib/api";

const SEASONS = [2026, 2025, 2024];

const COMPOUND_FILL: Record<string, string> = {
  SOFT: "#ef4444",
  MEDIUM: "#eab308",
  HARD: "#e5e5e5",
  INTERMEDIATE: "#22c55e",
  WET: "#3b82f6",
};

interface RaceOption {
  sessionKey: number;
  round: number;
  raceName: string;
  date: string;
}

interface StrategyPayload {
  raceName: string;
  season: number;
  raceLaps: number;
  referencePace: number;
  pitLossSeconds: number;
  pitLossSamples: number;
  compounds: {
    compound: string;
    offset: number;
    degPerLap: number;
    fuelPerLap: number;
    samples: number;
    r2: number;
  }[];
  actual: {
    driverNumber: number | null;
    acronym: string;
    lastName: string;
    finishPosition: number;
    stints: { compound: string; lapStart: number; lapEnd: number }[];
  }[];
  stops: {
    driverNumber: number | null;
    acronym: string;
    lap: number;
    duration: number;
  }[];
}

export default function RaceStrategy() {
  // Current season, matching every other page. Only races that have been
  // run are listed, so a season in progress simply offers fewer.
  const [season, setSeason] = useState(SEASONS[0]);
  const [races, setRaces] = useState<RaceOption[]>([]);
  const [sessionKey, setSessionKey] = useState<number | null>(null);
  const [data, setData] = useState<StrategyPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    axios
      .get(`${API_BASE}/api/races/season/${season}`)
      .then((res) => {
        if (cancelled) return;

        // Only races that have run have stints to chart.
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
      .get(`${API_BASE}/api/races/${sessionKey}/strategy`)
      .then((res) => !cancelled && setData(res.data))
      .catch(() => !cancelled && setError("No strategy data for this race"))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  // Degradation curves, drawn from the fitted model rather than raw laps, so
  // the trend is visible without the traffic noise.
  const curves = useMemo(() => {
    if (!data) return [];

    const maxAge = Math.min(40, data.raceLaps);

    return data.compounds.map((c) => ({
      compound: c.compound,
      r2: c.r2,
      degPerLap: c.degPerLap,
      points: Array.from({ length: maxAge }, (_, age) => ({
        age,
        delta: c.offset + c.degPerLap * age,
      })),
    }));
  }, [data]);

  const curveBounds = useMemo(() => {
    const all = curves.flatMap((c) => c.points.map((p) => p.delta));

    if (all.length === 0) return { min: 0, max: 1 };

    return { min: Math.min(...all), max: Math.max(...all) };
  }, [curves]);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0A0A0A] text-white">
        {/* Hero */}
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
            <div className="flex flex-wrap items-end justify-between gap-6 border-b border-neutral-900 pb-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-neutral-500">
                {season}
                <span className="mx-3 text-neutral-700">/</span>
                Strategy
              </p>

              {data && (
                <div className="flex flex-wrap items-center gap-6 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                  <span>
                    <span className="mr-2 text-lg font-bold tabular-nums text-white">
                      {data.raceLaps}
                    </span>
                    Laps
                  </span>
                  <span className="h-4 w-px bg-neutral-800" />
                  <span>
                    <span className="mr-2 text-lg font-bold tabular-nums text-white">
                      {data.stops.length}
                    </span>
                    Stops
                  </span>
                  <span className="h-4 w-px bg-neutral-800" />
                  <span>
                    <span className="mr-2 text-lg font-bold tabular-nums text-white">
                      {data.pitLossSeconds.toFixed(1)}s
                    </span>
                    Pit Loss
                  </span>
                </div>
              )}
            </div>

            <h1 className="mt-10 text-6xl font-black uppercase leading-[0.85] tracking-tight md:text-8xl">
              RACE STRATEGY
              <span className="text-red-500">.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-400">
              Every tyre every driver ran, when they stopped, and how quickly
              each compound gave up its pace.
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

          {!loading && !error && data && (
            <>
              {/* The classic strategy chart: one row per driver in finishing
                  order, stints as bars across the race distance. */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.35em] text-neutral-500">
                    Tyre Strategies
                  </h2>

                  <div className="flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    {data.compounds.map((c) => (
                      <span key={c.compound} className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ backgroundColor: COMPOUND_FILL[c.compound] }}
                        />
                        {c.compound}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 space-y-1.5">
                  {data.actual.map((driver) => (
                    <div
                      key={driver.acronym}
                      className="grid grid-cols-[2rem_3.5rem_1fr] items-center gap-3"
                    >
                      <span className="font-mono text-xs tabular-nums text-neutral-600">
                        {driver.finishPosition}
                      </span>
                      <span className="font-mono text-xs font-bold text-neutral-200">
                        {driver.acronym}
                      </span>

                      <div className="flex h-6 overflow-hidden rounded">
                        {driver.stints.map((stint, i) => {
                          const laps = stint.lapEnd - stint.lapStart + 1;

                          return (
                            <div
                              key={i}
                              className="flex items-center justify-center border-r border-black/50 text-[9px] font-bold text-black/70 last:border-0"
                              style={{
                                width: `${(laps / data.raceLaps) * 100}%`,
                                backgroundColor:
                                  COMPOUND_FILL[stint.compound] ?? "#525252",
                              }}
                              title={`${stint.compound} · laps ${stint.lapStart}–${stint.lapEnd} (${laps})`}
                            >
                              {laps > 3 ? laps : ""}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-4 border-t border-neutral-900 pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">
                  Finishing order · bar width is stint length over {data.raceLaps} laps
                </p>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                {/* Degradation */}
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.35em] text-neutral-500">
                    Tyre Degradation
                  </h2>

                  <svg viewBox="0 0 400 220" className="mt-5 w-full">
                    {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                      const y = 20 + f * 160;
                      const value =
                        curveBounds.max - f * (curveBounds.max - curveBounds.min);

                      return (
                        <g key={f}>
                          <line
                            x1={44}
                            x2={390}
                            y1={y}
                            y2={y}
                            stroke="#262626"
                            strokeWidth={1}
                          />
                          <text
                            x={38}
                            y={y + 3}
                            textAnchor="end"
                            fontSize={9}
                            fill="#737373"
                            fontFamily="ui-monospace, monospace"
                          >
                            {value >= 0 ? "+" : ""}
                            {value.toFixed(1)}s
                          </text>
                        </g>
                      );
                    })}

                    {curves.map((curve) => {
                      const span = curveBounds.max - curveBounds.min || 1;

                      const d = curve.points
                        .map((p, i) => {
                          const x = 44 + (p.age / (curve.points.length - 1)) * 346;
                          const y =
                            20 + ((curveBounds.max - p.delta) / span) * 160;

                          return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
                        })
                        .join(" ");

                      return (
                        <path
                          key={curve.compound}
                          d={d}
                          fill="none"
                          stroke={COMPOUND_FILL[curve.compound] ?? "#888"}
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                      );
                    })}

                    <text
                      x={44}
                      y={212}
                      fontSize={9}
                      fill="#737373"
                      fontFamily="ui-monospace, monospace"
                    >
                      new
                    </text>
                    <text
                      x={390}
                      y={212}
                      textAnchor="end"
                      fontSize={9}
                      fill="#737373"
                      fontFamily="ui-monospace, monospace"
                    >
                      tyre age →
                    </text>
                  </svg>

                  <div className="mt-3 space-y-1.5 border-t border-neutral-900 pt-3">
                    {curves.map((curve) => (
                      <div
                        key={curve.compound}
                        className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.15em]"
                      >
                        <span className="flex items-center gap-2 text-neutral-400">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: COMPOUND_FILL[curve.compound],
                            }}
                          />
                          {curve.compound}
                        </span>
                        <span className="tabular-nums text-neutral-300">
                          {curve.degPerLap.toFixed(3)}s / lap
                          <span className="ml-3 text-neutral-600">
                            R² {curve.r2.toFixed(2)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-[10px] leading-relaxed text-neutral-600">
                    Fitted from green-flag laps, controlling for fuel burn. The
                    curve is pace lost to tyre age alone.
                  </p>
                </div>

                {/* Pit stops */}
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h2 className="font-mono text-[11px] uppercase tracking-[0.35em] text-neutral-500">
                      Fastest Stops
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">
                      Pit lane time
                    </span>
                  </div>

                  <div className="mt-5 space-y-1">
                    {data.stops.slice(0, 12).map((stop, i) => {
                      const slowest = data.stops[data.stops.length - 1].duration;
                      const fastest = data.stops[0].duration;
                      const span = Math.max(slowest - fastest, 0.001);

                      return (
                        <div
                          key={`${stop.acronym}-${stop.lap}`}
                          className="relative grid grid-cols-[1.5rem_3.5rem_1fr_4rem] items-center gap-3 overflow-hidden rounded-lg px-2 py-1.5"
                        >
                          <span className="font-mono text-[10px] tabular-nums text-neutral-600">
                            {i + 1}
                          </span>
                          <span className="font-mono text-xs font-bold text-neutral-200">
                            {stop.acronym}
                          </span>

                          <span className="relative h-1.5 overflow-hidden rounded-full bg-neutral-900">
                            <span
                              className="absolute left-0 top-0 h-full rounded-full bg-red-500/70"
                              style={{
                                width: `${
                                  12 + ((stop.duration - fastest) / span) * 88
                                }%`,
                              }}
                            />
                          </span>

                          <span className="text-right font-mono text-xs tabular-nums text-white">
                            {stop.duration.toFixed(2)}s
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-4 border-t border-neutral-900 pt-3 text-[10px] leading-relaxed text-neutral-600">
                    Time in the pit lane, not just stationary. Median across all{" "}
                    {data.pitLossSamples} stops was{" "}
                    {data.pitLossSeconds.toFixed(1)}s of race time lost — pit
                    lane plus the in and out laps.
                  </p>
                </div>
              </div>

              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-700">
                Reference pace {formatLapTime(data.referencePace)} ·{" "}
                {data.compounds.reduce((s, c) => s + c.samples, 0)} laps modelled
              </p>
            </>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
