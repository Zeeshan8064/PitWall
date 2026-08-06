import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SeasonChart from "../Teams/SeasonChart";
import { API_BASE } from "../../lib/api";

// Canonical shapes for the /drivers/:number payload — imported by
// DriverProfile rather than redeclared, so they cannot drift apart.
export interface SeasonStats {
  starts: number;
  wins: number;
  podiums: number;
  poles: number;
  frontRows: number;
  pointsFinishes: number;
  dnfs: number;
  finishRate: number;
  bestFinish: number | null;
  averageFinish: number;
  averageGrid: number | null;
  placesGained: number;
  lapsCompleted: number;
  racePoints: number;
  sprintPoints: number;
  totalPoints: number;
}

export interface TimelineRow {
  round: number;
  raceName: string;
  sessionKey: number | null;
  gridPosition: number | null;
  finishPosition: number | null;
  status: string | null;
  points: number | null;
  championshipPoints: number | null;
  championshipPosition: number | null;
}

interface DriverStatsProps {
  driverNumber: number;
  teamColour: string;
  stats?: SeasonStats | null;
  timeline?: TimelineRow[];
  availableSeasons?: number[];
  initialSeason?: number | null;
}

// "career" spans every ingested season rather than a driver's whole time in
// the sport — the database starts at 2024, and the UI says so.
type Scope = number | "career";

function withHash(colour: string) {
  return colour?.startsWith("#") ? colour : `#${colour || "666666"}`;
}

function Panel({
  label,
  headline,
  headlineLabel,
  rows,
  colour,
}: {
  label: string;
  headline: string | number;
  headlineLabel: string;
  rows: { label: string; value: string | number }[];
  colour: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
      <span
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ backgroundColor: colour }}
      />

      <p className="pl-2 font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
        {label}
      </p>

      <div className="mt-5 flex items-baseline gap-3 pl-2">
        <span className="text-5xl font-black leading-none text-white tabular-nums">
          {headline}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
          {headlineLabel}
        </span>
      </div>

      <dl className="mt-6 space-y-2.5 border-t border-neutral-900 pl-2 pt-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4">
            <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">
              {row.label}
            </dt>
            <dd className="font-mono text-sm font-bold tabular-nums text-neutral-200">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function DriverStats({
  driverNumber,
  teamColour,
  stats: providedStats,
  timeline: providedTimeline = [],
  availableSeasons = [],
  initialSeason = null,
}: DriverStatsProps) {
  const [scope, setScope] = useState<Scope>(initialSeason ?? "career");
  const [stats, setStats] = useState<SeasonStats | null>(providedStats ?? null);
  const [timeline, setTimeline] = useState<TimelineRow[]>(providedTimeline);
  const [loading, setLoading] = useState(false);

  const colour = withHash(teamColour);

  useEffect(() => {
    // The initial view is already in hand from the parent.
    if (scope === initialSeason && providedStats) {
      setStats(providedStats);
      setTimeline(providedTimeline);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const response = await fetch(
          `${API_BASE}/api/races/drivers/${driverNumber}?season=${scope}`
        );

        const data = await response.json();

        if (cancelled) return;

        setStats(data.stats ?? null);
        setTimeline(data.timeline ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [driverNumber, scope, initialSeason, providedStats, providedTimeline]);

  const options: Scope[] = ["career", ...availableSeasons];

  const raced = timeline.filter(
    (row) => row.finishPosition !== null || row.status !== null
  );

  const dash = (value: number | null | undefined, suffix = "") =>
    value === null || value === undefined ? "—" : `${value}${suffix}`;

  return (
    <>
      <section className="mx-auto max-w-7xl px-8 pt-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p
              className="font-mono text-[11px] font-bold uppercase tracking-[0.4em]"
              style={{ color: colour }}
            >
              {scope === "career" ? "Career" : `${scope} Season`}
            </p>

            <h2 className="mt-3 text-5xl font-black uppercase text-white">
              Statistics
            </h2>

            {scope === "career" && availableSeasons.length > 0 && (
              // Stated plainly rather than implied: this is not a full career.
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">
                {availableSeasons[availableSeasons.length - 1]}–
                {availableSeasons[0]} · {availableSeasons.length} seasons on record
              </p>
            )}
          </div>

          {options.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {options.map((option) => {
                const isActive = option === scope;

                return (
                  <button
                    key={String(option)}
                    onClick={() => setScope(option)}
                    className={`rounded-xl border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors duration-200 ${
                      isActive
                        ? "text-white"
                        : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-white"
                    }`}
                    style={
                      isActive
                        ? { borderColor: colour, backgroundColor: `${colour}22` }
                        : undefined
                    }
                  >
                    {option === "career" ? "Career" : option}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Grouped by the question each answers, rather than eight identical
            tiles that give every figure the same weight. */}
        <div
          className={`grid gap-5 transition-opacity duration-200 lg:grid-cols-3 ${
            loading ? "opacity-40" : "opacity-100"
          }`}
        >
          <Panel
            label="Results"
            headline={stats?.wins ?? "—"}
            headlineLabel={stats?.wins === 1 ? "Win" : "Wins"}
            colour={colour}
            rows={[
              { label: "Podiums", value: dash(stats?.podiums) },
              { label: "Points Finishes", value: dash(stats?.pointsFinishes) },
              { label: "Best Finish", value: stats?.bestFinish ? `P${stats.bestFinish}` : "—" },
              { label: "Points", value: dash(stats?.totalPoints) },
              { label: "of which Sprint", value: dash(stats?.sprintPoints) },
            ]}
          />

          <Panel
            label="Qualifying"
            headline={stats?.poles ?? "—"}
            headlineLabel={stats?.poles === 1 ? "Pole" : "Poles"}
            colour={colour}
            rows={[
              { label: "Front Rows", value: dash(stats?.frontRows) },
              {
                label: "Avg Grid",
                value: stats?.averageGrid ? stats.averageGrid.toFixed(1) : "—",
              },
              {
                label: "Avg Finish",
                value:
                  stats?.averageFinish && stats.averageFinish > 0
                    ? stats.averageFinish.toFixed(1)
                    : "—",
              },
              {
                label: "Places Gained",
                value:
                  stats?.placesGained != null
                    ? `${stats.placesGained > 0 ? "+" : ""}${stats.placesGained}`
                    : "—",
              },
            ]}
          />

          <Panel
            label="Reliability"
            headline={stats?.starts ?? "—"}
            headlineLabel="Starts"
            colour={colour}
            rows={[
              { label: "Retirements", value: dash(stats?.dnfs) },
              {
                label: "Finish Rate",
                value:
                  stats?.finishRate != null
                    ? `${Math.round(stats.finishRate * 100)}%`
                    : "—",
              },
              { label: "Laps Completed", value: dash(stats?.lapsCompleted) },
            ]}
          />
        </div>
      </section>

      {/* Season form — reuses the constructors chart, since a driver's season
          has exactly the same shape: points per round against position. */}
      {scope !== "career" && raced.length > 1 && (
        <section className="mx-auto max-w-7xl px-8 pt-16">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.4em] text-neutral-500">
            Season Form
          </h2>

          <SeasonChart
            color={colour}
            timeline={timeline.map((row) => ({
              round: row.round,
              raceName: row.raceName,
              points: row.championshipPoints,
              position: row.championshipPosition,
            }))}
          />
        </section>
      )}

      {/* Round by round */}
      {scope !== "career" && raced.length > 0 && (
        <section className="mx-auto max-w-7xl px-8 pb-24 pt-16">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.4em] text-neutral-500">
            Round by Round
          </h2>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-neutral-800 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">
                  <th className="px-5 py-3 font-normal">Rnd</th>
                  <th className="px-5 py-3 font-normal">Grand Prix</th>
                  <th className="px-5 py-3 text-right font-normal">Grid</th>
                  <th className="px-5 py-3 text-right font-normal">Finish</th>
                  <th className="px-5 py-3 text-right font-normal">+/−</th>
                  <th className="px-5 py-3 text-right font-normal">Pts</th>
                </tr>
              </thead>

              <tbody>
                {raced.map((row) => {
                  const retired = row.status === "DNF" || row.status === "DSQ";

                  const gained =
                    row.gridPosition != null && row.finishPosition != null
                      ? row.gridPosition - row.finishPosition
                      : null;

                  return (
                    <tr
                      key={row.round}
                      className="border-b border-neutral-900 transition-colors last:border-0 hover:bg-neutral-900/60"
                    >
                      <td className="px-5 py-3 font-mono text-xs tabular-nums text-neutral-500">
                        {row.round}
                      </td>

                      <td className="px-5 py-3 text-sm font-semibold text-white">
                        {row.sessionKey ? (
                          <Link
                            to={`/race/${row.sessionKey}`}
                            className="transition-colors hover:text-neutral-300"
                          >
                            {row.raceName}
                          </Link>
                        ) : (
                          row.raceName
                        )}
                      </td>

                      <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-neutral-400">
                        {row.gridPosition ?? "—"}
                      </td>

                      <td className="px-5 py-3 text-right font-mono text-xs tabular-nums">
                        {retired ? (
                          <span className="font-bold text-red-400">{row.status}</span>
                        ) : row.finishPosition === 1 ? (
                          <span className="font-bold" style={{ color: colour }}>
                            P1
                          </span>
                        ) : (
                          <span className="text-neutral-200">
                            {row.finishPosition ? `P${row.finishPosition}` : "—"}
                          </span>
                        )}
                      </td>

                      <td
                        className={`px-5 py-3 text-right font-mono text-xs tabular-nums ${
                          gained == null
                            ? "text-neutral-700"
                            : gained > 0
                              ? "text-emerald-400"
                              : gained < 0
                                ? "text-red-400"
                                : "text-neutral-500"
                        }`}
                      >
                        {gained == null ? "—" : gained > 0 ? `+${gained}` : gained}
                      </td>

                      <td className="px-5 py-3 text-right font-mono text-xs font-bold tabular-nums text-white">
                        {row.points ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
