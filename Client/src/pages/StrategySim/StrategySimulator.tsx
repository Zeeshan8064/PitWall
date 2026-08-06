import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { COMPOUND_STYLES } from "../RaceReplay/F1utils";
import {
  findOptimal,
  formatDelta,
  formatRaceTime,
  predictFinish,
  simulate,
  stintsFromActual,
  type Stint,
  type StrategyModel,
} from "./strategyModel";
import { API_BASE } from "../../lib/api";

const SEASONS = [2026, 2025, 2024];

interface RaceOption {
  sessionKey: number;
  round: number;
  raceName: string;
  date: string;
}

const COMPOUND_FILL: Record<string, string> = {
  SOFT: "#ef4444",
  MEDIUM: "#eab308",
  HARD: "#e5e5e5",
  INTERMEDIATE: "#22c55e",
  WET: "#3b82f6",
};

export default function StrategySimulator() {
  const [season, setSeason] = useState(SEASONS[1]);
  const [races, setRaces] = useState<RaceOption[]>([]);
  const [sessionKey, setSessionKey] = useState<number | null>(null);

  const [model, setModel] = useState<StrategyModel | null>(null);
  const [stints, setStints] = useState<Stint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Race list ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/races/season/${season}`);

        if (cancelled) return;

        // Only races that have been run have laps to fit a model to.
        const run = (res.data.races ?? []).filter(
          (race: RaceOption) => new Date(race.date) <= new Date()
        );

        setRaces(run);
        setSessionKey(run[run.length - 1]?.sessionKey ?? null);
      } catch {
        if (!cancelled) setError("Failed to load races");
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [season]);

  // ─── Model ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionKey) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setModel(null);

      try {
        const res = await axios.get(
          `${API_BASE}/api/races/${sessionKey}/strategy`
        );

        if (cancelled) return;

        const next: StrategyModel = res.data;
        setModel(next);

        // Open on the fastest one-stop the model can find, so the page lands
        // on something meaningful rather than an empty editor.
        // Default to the winner's car, so the opening view answers "with the
        // winning car, was there a better strategy?".
        setPaceDriver(
          next.actual.find((a) => a.finishPosition === 1)?.acronym ?? null
        );

        const opening =
          findOptimal(next, 1) ??
          (next.compounds.length >= 2
            ? [
                { compound: next.compounds[0].compound, laps: Math.floor(next.raceLaps / 2) },
                {
                  compound: next.compounds[1].compound,
                  laps: next.raceLaps - Math.floor(next.raceLaps / 2),
                },
              ]
            : []);

        setStints(opening);
      } catch (err) {
        if (cancelled) return;

        setError(
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : "Failed to build a model for this race"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  // ─── Simulation ───────────────────────────────────────────────────────────
  // Which car you are driving. A projected finishing position is meaningless
  // without it — strategy alone cannot put a slow car on pole.
  const [paceDriver, setPaceDriver] = useState<string | null>(null);

  const carPace = useMemo(() => {
    if (!model) return null;

    const chosen = model.actual.find((a) => a.acronym === paceDriver);

    return chosen?.baseline ?? model.referencePace;
  }, [model, paceDriver]);

  const result = useMemo(
    () => (model && carPace ? simulate(model, stints, carPace) : null),
    [model, stints, carPace]
  );

  const prediction = useMemo(
    () => (model && carPace ? predictFinish(model, stints, carPace) : null),
    [model, stints, carPace]
  );

  const benchmarks = useMemo(() => {
    if (!model) return [];

    const rows: { label: string; detail: string; seconds: number }[] = [];

    const winner = model.actual.find((a) => a.finishPosition === 1);

    if (winner) {
      const sim = simulate(model, stintsFromActual(winner));

      if (sim.valid) {
        rows.push({
          label: `${winner.lastName}'s actual`,
          detail: winner.stints
            .map((s) => `${s.compound[0]} ${s.lapStart}–${s.lapEnd}`)
            .join(" / "),
          seconds: sim.totalSeconds,
        });
      }
    }

    for (const stops of [1, 2, 3]) {
      const optimal = findOptimal(model, stops);
      if (!optimal) continue;

      const sim = simulate(model, optimal);
      if (!sim.valid) continue;

      rows.push({
        label: `Optimal ${stops}-stop`,
        detail: optimal.map((s) => `${s.compound[0]} ×${s.laps}`).join(" / "),
        seconds: sim.totalSeconds,
      });
    }

    return rows.sort((a, b) => a.seconds - b.seconds);
  }, [model]);

  // ─── Stint editing ────────────────────────────────────────────────────────
  const setStintLaps = (index: number, laps: number) => {
    setStints((current) => {
      const next = [...current];
      const delta = laps - next[index].laps;

      // Take the difference from the following stint so the race always adds
      // up; a strategy that does not cover the distance cannot be simulated.
      const neighbour = index === next.length - 1 ? index - 1 : index + 1;
      if (neighbour < 0) return current;

      const neighbourLaps = next[neighbour].laps - delta;
      if (laps < 1 || neighbourLaps < 1) return current;

      next[index] = { ...next[index], laps };
      next[neighbour] = { ...next[neighbour], laps: neighbourLaps };

      return next;
    });
  };

  const setStintCompound = (index: number, compound: string) => {
    setStints((current) =>
      current.map((s, i) => (i === index ? { ...s, compound } : s))
    );
  };

  const addStint = () => {
    if (!model) return;

    setStints((current) => {
      const longest = current.reduce(
        (best, s, i) => (s.laps > current[best].laps ? i : best),
        0
      );

      if (current[longest].laps < 10) return current;

      const half = Math.floor(current[longest].laps / 2);
      const next = [...current];

      next.splice(longest, 1, { ...next[longest], laps: half }, {
        compound:
          model.compounds[current.length % model.compounds.length].compound,
        laps: current[longest].laps - half,
      });

      return next;
    });
  };

  const removeStint = (index: number) => {
    setStints((current) => {
      if (current.length <= 2) return current;

      const next = current.filter((_, i) => i !== index);
      const absorb = index === 0 ? 0 : index - 1;

      next[absorb] = {
        ...next[absorb],
        laps: next[absorb].laps + current[index].laps,
      };

      return next;
    });
  };

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
                "repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 56px)," +
                "repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 56px)",
            }}
          />

          <div className="relative mx-auto max-w-375 px-8 pb-10 pt-20">
            <div className="flex flex-wrap items-end justify-between gap-6 border-b border-neutral-900 pb-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-neutral-500">
                {season}
                <span className="mx-3 text-neutral-700">/</span>
                Strategy
              </p>

              {model && (
                <div className="flex flex-wrap items-center gap-6 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                  <span>
                    <span className="mr-2 text-lg font-bold tabular-nums text-white">
                      {model.raceLaps}
                    </span>
                    Laps
                  </span>
                  <span className="h-4 w-px bg-neutral-800" />
                  <span>
                    <span className="mr-2 text-lg font-bold tabular-nums text-white">
                      {model.pitLossSeconds.toFixed(1)}s
                    </span>
                    Pit Loss
                  </span>
                </div>
              )}
            </div>

            <h1 className="mt-10 text-6xl font-black uppercase leading-[0.85] tracking-tight md:text-8xl">
              STRATEGY SIMULATOR
              <span className="text-red-500">.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-400">
              Tyre degradation, fuel effect and pit loss fitted from this
              circuit's actual laps. Build a strategy and see it timed against
              what the winner really did.
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

        <section className="mx-auto max-w-375 px-8 pb-24 pt-12">
          {loading && (
            <div className="h-64 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900" />
          )}

          {error && <p className="text-red-400">{error}</p>}

          {!loading && !error && model && (
            <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
              {/* Editor */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="font-mono text-[11px] uppercase tracking-[0.35em] text-neutral-500">
                      Your Strategy
                    </h2>

                    <button
                      onClick={addStint}
                      className="rounded-lg border border-neutral-700 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
                    >
                      + Add Stop
                    </button>
                  </div>

                  {/* Timeline */}
                  <div className="mt-5 flex h-10 overflow-hidden rounded-lg">
                    {stints.map((stint, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-center border-r border-black/40 text-[10px] font-bold text-black/80 last:border-0"
                        style={{
                          width: `${(stint.laps / model.raceLaps) * 100}%`,
                          backgroundColor: COMPOUND_FILL[stint.compound] ?? "#666",
                        }}
                        title={`${stint.compound} · ${stint.laps} laps`}
                      >
                        {stint.laps}
                      </div>
                    ))}
                  </div>

                  {/* Stint rows */}
                  <div className="mt-6 space-y-4">
                    {stints.map((stint, i) => {
                      const startLap =
                        stints.slice(0, i).reduce((s, x) => s + x.laps, 0) + 1;

                      return (
                        <div
                          key={i}
                          className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
                              Stint {i + 1} · L{startLap}–{startLap + stint.laps - 1}
                            </span>

                            {stints.length > 2 && (
                              <button
                                onClick={() => removeStint(i)}
                                className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600 transition-colors hover:text-red-400"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {model.compounds.map((c) => (
                              <button
                                key={c.compound}
                                onClick={() => setStintCompound(i, c.compound)}
                                className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${
                                  stint.compound === c.compound
                                    ? COMPOUND_STYLES[c.compound] ??
                                      "border-neutral-600 text-white"
                                    : "border-neutral-800 text-neutral-500 hover:text-white"
                                }`}
                              >
                                {c.compound}
                              </button>
                            ))}
                          </div>

                          <div className="mt-4 flex items-center gap-4">
                            <input
                              type="range"
                              min={1}
                              max={model.raceLaps - 1}
                              value={stint.laps}
                              onChange={(e) =>
                                setStintLaps(i, Number(e.target.value))
                              }
                              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-800 accent-red-500"
                            />
                            <span className="w-16 text-right font-mono text-sm font-bold tabular-nums text-white">
                              {stint.laps} L
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Predicted classification */}
                {prediction && prediction.rows.length > 1 && (
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h2 className="font-mono text-[11px] uppercase tracking-[0.35em] text-neutral-500">
                        Projected Classification
                      </h2>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">
                        Every car re-simulated · green flag only
                      </p>
                    </div>

                    <div className="mt-5 space-y-1">
                      {prediction.rows.map((row, index) => {
                        const leader = prediction.rows[0].seconds;

                        // Where the model puts them versus where they really
                        // finished — the gap is safety cars, traffic and
                        // everything else this does not model.
                        const drift =
                          row.actualPosition !== null
                            ? row.actualPosition - (index + 1)
                            : null;

                        return (
                          <div
                            key={row.key}
                            className={`grid grid-cols-[2.5rem_1fr_auto_auto] items-center gap-3 rounded-lg px-3 py-2 ${
                              row.isYou
                                ? "border border-red-500/60 bg-red-500/10"
                                : "border border-transparent"
                            }`}
                          >
                            <span className="font-mono text-sm font-black tabular-nums text-white">
                              {index + 1}
                            </span>

                            <span className="min-w-0">
                              <span
                                className={`block truncate text-sm font-bold uppercase ${
                                  row.isYou ? "text-red-400" : "text-neutral-200"
                                }`}
                              >
                                {row.label}
                              </span>
                              <span className="block truncate font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-600">
                                {row.detail}
                              </span>
                            </span>

                            <span className="text-right font-mono text-[11px] tabular-nums text-neutral-400">
                              {index === 0
                                ? formatRaceTime(row.seconds)
                                : `+${(row.seconds - leader).toFixed(1)}`}
                            </span>

                            <span className="w-12 text-right font-mono text-[10px] tabular-nums text-neutral-600">
                              {drift === null
                                ? ""
                                : drift === 0
                                  ? "="
                                  : drift > 0
                                    ? `▲${drift}`
                                    : `▼${Math.abs(drift)}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <p className="mt-4 border-t border-neutral-900 pt-3 text-[10px] leading-relaxed text-neutral-600">
                      The last column is how far the model moves a driver from
                      where they actually finished. Large moves are where safety
                      cars, traffic or incidents decided the race rather than
                      pace and strategy.
                    </p>
                  </div>
                )}

                {/* Benchmarks */}
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.35em] text-neutral-500">
                    Compared With
                  </h2>

                  <div className="mt-5 space-y-2">
                    {benchmarks.map((row) => {
                      const delta = result?.valid
                        ? result.totalSeconds - row.seconds
                        : null;

                      return (
                        <div
                          key={row.label}
                          className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-900 pb-3 last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white">
                              {row.label}
                            </p>
                            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-600">
                              {row.detail}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-mono text-sm font-bold tabular-nums text-neutral-200">
                              {formatRaceTime(row.seconds)}
                            </p>
                            {delta !== null && (
                              <p
                                className={`font-mono text-[11px] tabular-nums ${
                                  delta < 0 ? "text-emerald-400" : "text-red-400"
                                }`}
                              >
                                you {formatDelta(delta)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Result + model */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                    Projected Race Time
                  </p>

                  {result?.valid ? (
                    <>
                      <p className="mt-4 font-mono text-4xl font-black tabular-nums text-white">
                        {formatRaceTime(result.totalSeconds)}
                      </p>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
                        {result.stops} stop{result.stops === 1 ? "" : "s"} ·{" "}
                        {(result.stops * model.pitLossSeconds).toFixed(1)}s in the pits
                      </p>

                      {prediction?.position && (
                        <div className="mt-5 border-t border-neutral-900 pt-4">
                          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                            Predicted Finish
                          </p>
                          <p className="mt-2 text-5xl font-black leading-none text-red-500">
                            P{prediction.position}
                          </p>
                          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">
                            of {prediction.rows.length} cars
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-red-400">{result?.problem}</p>
                  )}
                </div>

                {/* Car pace */}
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                    Your Car
                  </p>

                  <select
                    value={paceDriver ?? ""}
                    onChange={(e) => setPaceDriver(e.target.value)}
                    className="mt-4 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white focus:border-red-500 focus:outline-none"
                  >
                    {model.actual.map((a) => (
                      <option key={a.acronym} value={a.acronym}>
                        {a.lastName} · {a.baseline.toFixed(2)}s
                      </option>
                    ))}
                  </select>

                  <p className="mt-3 text-[10px] leading-relaxed text-neutral-600">
                    Strategy alone cannot put a slow car on pole, so the
                    projection runs at a real car's measured pace. Everyone else
                    is simulated at theirs.
                  </p>
                </div>

                {/* The model itself, stated openly so the projection can be
                    judged rather than taken on trust. */}
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                    Fitted Model
                  </p>

                  <p className="mt-3 font-mono text-[10px] leading-relaxed text-neutral-600">
                    {model.circuit ?? model.raceName} · {model.season}
                  </p>

                  <table className="mt-4 w-full text-left font-mono text-[10px]">
                    <thead>
                      <tr className="text-neutral-600">
                        <th className="pb-2 font-normal uppercase tracking-[0.15em]">
                          Tyre
                        </th>
                        <th className="pb-2 text-right font-normal uppercase tracking-[0.15em]">
                          Deg
                        </th>
                        <th className="pb-2 text-right font-normal uppercase tracking-[0.15em]">
                          R²
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {model.compounds.map((c) => (
                        <tr key={c.compound} className="border-t border-neutral-900">
                          <td className="py-2">
                            <span
                              className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                              style={{
                                backgroundColor: COMPOUND_FILL[c.compound] ?? "#666",
                              }}
                            />
                            <span className="text-neutral-300">{c.compound}</span>
                          </td>
                          <td className="py-2 text-right tabular-nums text-neutral-300">
                            {c.degPerLap.toFixed(3)}s
                          </td>
                          <td className="py-2 text-right tabular-nums text-neutral-500">
                            {c.r2.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <p className="mt-4 border-t border-neutral-900 pt-3 text-[10px] leading-relaxed text-neutral-600">
                    Fitted from {model.compounds.reduce((s, c) => s + c.samples, 0)}{" "}
                    green-flag laps, controlling for fuel burn. Pit loss is the
                    median over {model.pitLossSamples} real stops.
                  </p>

                  <p className="mt-3 text-[10px] leading-relaxed text-neutral-600">
                    Green-flag running only — no safety cars, traffic or
                    weather. Treat it as a pace model, not a race prediction.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
