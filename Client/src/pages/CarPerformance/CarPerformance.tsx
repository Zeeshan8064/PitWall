import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { formatSectorTime } from "../RaceReplay/F1utils";
import type { Driver, Lap } from "../RaceReplay/raceTypes";
import { API_BASE } from "../../lib/api";

const SEASONS = [2026, 2025, 2024];

interface RaceOption {
  sessionKey: number;
  round: number;
  raceName: string;
  date: string;
}

interface TeamRow {
  team: string;
  colour: string;
  // Best of the team's two cars in each sector, which is how a car's ceiling
  // is normally judged.
  sectors: [number | null, number | null, number | null];
  topSpeed: number | null;
  bestLap: number | null;
}

export default function CarPerformance() {
  // Current season, matching every other page. Only races that have been
  // run are listed, so a season in progress simply offers fewer.
  const [season, setSeason] = useState(SEASONS[0]);
  const [races, setRaces] = useState<RaceOption[]>([]);
  const [sessionKey, setSessionKey] = useState<number | null>(null);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [laps, setLaps] = useState<Lap[]>([]);
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

        setDrivers(res.data.drivers ?? []);
        setLaps(res.data.laps ?? []);
      })
      .catch(() => !cancelled && setError("Failed to load race data"))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  const teams = useMemo<TeamRow[]>(() => {
    if (drivers.length === 0) return [];

    const teamByDriver = new Map(drivers.map((d) => [d.driverNumber, d]));
    const grouped = new Map<string, Lap[]>();

    for (const lap of laps) {
      const driver = teamByDriver.get(lap.driverNumber);
      if (!driver) continue;

      grouped.set(driver.team, [...(grouped.get(driver.team) ?? []), lap]);
    }

    const rows: TeamRow[] = [];

    for (const [team, teamLaps] of grouped) {
      const colour =
        teamByDriver.get(teamLaps[0].driverNumber)?.teamColour ?? "666666";

      const best = (key: "sector1" | "sector2" | "sector3") => {
        const values = teamLaps
          .map((l) => l[key])
          .filter((v): v is number => v != null && v > 0);

        return values.length ? Math.min(...values) : null;
      };

      const lapTimes = teamLaps
        .filter((l) => l.lapDuration != null && !l.isPitOutLap)
        .map((l) => l.lapDuration as number);

      // Speed trap: the highest reading the team recorded all race.
      const speeds = teamLaps
        .map((l) => (l as Lap & { stSpeed?: number | null }).stSpeed)
        .filter((v): v is number => v != null && v > 0);

      rows.push({
        team,
        colour: colour.startsWith("#") ? colour : `#${colour}`,
        sectors: [best("sector1"), best("sector2"), best("sector3")],
        topSpeed: speeds.length ? Math.max(...speeds) : null,
        bestLap: lapTimes.length ? Math.min(...lapTimes) : null,
      });
    }

    return rows.sort((a, b) => (a.bestLap ?? Infinity) - (b.bestLap ?? Infinity));
  }, [drivers, laps]);

  // Each sector's benchmark, so a team can be read as a deficit rather than an
  // absolute time that means nothing without a reference.
  const benchmarks = useMemo(() => {
    const pick = (i: 0 | 1 | 2) => {
      const values = teams
        .map((t) => t.sectors[i])
        .filter((v): v is number => v != null);

      return values.length ? Math.min(...values) : null;
    };

    const speeds = teams
      .map((t) => t.topSpeed)
      .filter((v): v is number => v != null);

    return {
      sectors: [pick(0), pick(1), pick(2)] as (number | null)[],
      topSpeed: speeds.length ? Math.max(...speeds) : null,
    };
  }, [teams]);

  const hasSpeed = teams.some((t) => t.topSpeed !== null);

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
              Car Performance
            </p>

            <h1 className="mt-10 text-6xl font-black uppercase leading-[0.85] tracking-tight md:text-8xl">
              CAR PERFORMANCE
              <span className="text-red-500">.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-400">
              Where each car finds and loses its lap time, sector by sector,
              measured against the quickest car through each one.
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

          {!loading && !error && teams.length > 0 && (
            <>
              {/* Sector deficits */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.35em] text-neutral-500">
                    Sector Deficit
                  </h2>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">
                    Best of each team's two cars · vs quickest in sector
                  </p>
                </div>

                <div className="mt-6 space-y-2">
                  {teams.map((team) => (
                    <div
                      key={team.team}
                      className="grid grid-cols-[9rem_1fr] items-center gap-4"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-6 w-[3px] shrink-0 rounded-full"
                          style={{ backgroundColor: team.colour }}
                        />
                        <span className="truncate font-mono text-[11px] uppercase tracking-[0.1em] text-neutral-300">
                          {team.team}
                        </span>
                      </span>

                      <div className="grid grid-cols-3 gap-2">
                        {([0, 1, 2] as const).map((i) => {
                          const value = team.sectors[i];
                          const bench = benchmarks.sectors[i];
                          const deficit =
                            value != null && bench != null ? value - bench : null;

                          // Scaled against a third of a second, which is a
                          // large gap in a single sector.
                          const share =
                            deficit != null
                              ? Math.min(deficit / 0.35, 1)
                              : 0;

                          return (
                            <div
                              key={i}
                              className="relative h-7 overflow-hidden rounded bg-neutral-900"
                              title={`S${i + 1} ${
                                value != null ? formatSectorTime(value) : "—"
                              }${
                                deficit != null ? ` · +${deficit.toFixed(3)}s` : ""
                              }`}
                            >
                              <span
                                className="absolute inset-y-0 left-0"
                                style={{
                                  width: `${Math.max(6, (1 - share) * 100)}%`,
                                  backgroundColor: team.colour,
                                  opacity: deficit === 0 ? 1 : 0.55,
                                }}
                              />
                              <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-bold tabular-nums text-white mix-blend-difference">
                                {deficit == null
                                  ? "—"
                                  : deficit === 0
                                    ? "BEST"
                                    : `+${deficit.toFixed(2)}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-[9rem_1fr] gap-4 border-t border-neutral-900 pt-3">
                  <span />
                  <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">
                    <span>Sector 1</span>
                    <span>Sector 2</span>
                    <span>Sector 3</span>
                  </div>
                </div>
              </div>

              {/* Speed trap */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.35em] text-neutral-500">
                    Speed Trap
                  </h2>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">
                    Highest reading of the race
                  </p>
                </div>

                {hasSpeed ? (
                  <div className="mt-6 space-y-2">
                    {[...teams]
                      .sort((a, b) => (b.topSpeed ?? 0) - (a.topSpeed ?? 0))
                      .map((team) => {
                        const best = benchmarks.topSpeed ?? 1;
                        const share = team.topSpeed ? team.topSpeed / best : 0;

                        return (
                          <div
                            key={team.team}
                            className="grid grid-cols-[9rem_1fr_5rem] items-center gap-4"
                          >
                            <span className="truncate font-mono text-[11px] uppercase tracking-[0.1em] text-neutral-300">
                              {team.team}
                            </span>

                            <span className="relative h-2 overflow-hidden rounded-full bg-neutral-900">
                              <span
                                className="absolute inset-y-0 left-0 rounded-full"
                                style={{
                                  // Zoomed to the 85–100% band: every F1 car is
                                  // within ~15% of the fastest, and a full-scale
                                  // bar would make them look identical.
                                  width: `${Math.max(0, (share - 0.85) / 0.15) * 100}%`,
                                  backgroundColor: team.colour,
                                }}
                              />
                            </span>

                            <span className="text-right font-mono text-xs tabular-nums text-white">
                              {team.topSpeed ? `${Math.round(team.topSpeed)}` : "—"}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="mt-5 text-neutral-600">
                    No speed trap readings recorded for this session.
                  </p>
                )}
              </div>

              {/* What this page cannot yet show, stated rather than implied. */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.35em] text-neutral-500">
                  Scope
                </h2>

                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-neutral-400">
                  Sector times and the speed trap are the only performance
                  measures currently ingested, so this compares cars on where
                  they gain and lose across the lap.
                </p>

                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-500">
                  Throttle traces, braking points, DRS usage and full-throttle
                  percentage all come from OpenF1's{" "}
                  <span className="font-mono text-neutral-400">/car_data</span>{" "}
                  endpoint, which is not part of the pipeline — it samples at
                  ~3.7Hz per car, so it needs a lap-grain aggregation pass
                  rather than raw storage. Until then, treat sector deficits as
                  a proxy for cornering and the speed trap as a proxy for
                  straightline pace.
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
