import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { getCountryIso } from "../RaceReplay/F1utils";
import { API_BASE } from "../../lib/api";

const SEASONS = [2026, 2025, 2024];

type Table = "drivers" | "constructors";

interface DriverRow {
  driverNumber: number;
  firstName: string;
  lastName: string;
  acronym: string;
  countryCode: string | null;
  team: string;
  teamColour: string;
  points: number;
  pointsGained: number;
  position: number;
  positionChange: number;
}

interface ConstructorRow {
  name: string;
  slug: string;
  country: string | null;
  colour: string;
  points: number;
  pointsGained: number;
  position: number;
  positionChange: number;
}

interface Standings {
  season: number;
  round: number | null;
  raceName: string | null;
  drivers: DriverRow[];
  constructors: ConstructorRow[];
}

function withHash(colour: string) {
  if (!colour) return "#666666";

  return colour.startsWith("#") ? colour : `#${colour}`;
}

// Championship movement over the latest round. Zero is deliberately blank
// rather than a dash — most of the field holds station most weekends, and a
// column of dashes reads as missing data.
function Movement({ change }: { change: number }) {
  if (!change) return <span className="text-neutral-800">·</span>;

  const up = change > 0;

  return (
    <span
      className={`font-mono text-[11px] font-bold tabular-nums ${
        up ? "text-emerald-400" : "text-red-400"
      }`}
    >
      {up ? "▲" : "▼"}
      {Math.abs(change)}
    </span>
  );
}

export default function Championship() {
  const [season, setSeason] = useState(SEASONS[0]);
  const [table, setTable] = useState<Table>("drivers");
  const [data, setData] = useState<Standings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // Both tables in one pass: the toggle then costs nothing, and the
        // header can state the leader of either without a second round trip.
        const [driversRes, constructorsRes] = await Promise.all([
          axios.get(`${API_BASE}/api/races/championship/drivers/${season}`),
          axios.get(`${API_BASE}/api/races/championship/constructors/${season}`),
        ]);

        if (cancelled) return;

        setData({
          season,
          round: driversRes.data.round ?? constructorsRes.data.round ?? null,
          raceName: driversRes.data.raceName ?? null,
          drivers: driversRes.data.standings ?? [],
          constructors: constructorsRes.data.standings ?? [],
        });
      } catch {
        if (!cancelled) setError("Failed to load standings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [season]);

  const rows = table === "drivers" ? data?.drivers ?? [] : data?.constructors ?? [];

  // Bars are scaled to the leader, so the gap is legible as a shape rather
  // than something you have to compute from two numbers.
  const leaderPoints = useMemo(
    () => Math.max(1, ...rows.map((row) => row.points)),
    [rows]
  );

  const leader = rows[0];

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

          {/* Leader's colour lights the hero */}
          {leader && (
            <div
              aria-hidden
              className="pointer-events-none absolute right-[12%] top-1/2 h-[30rem] w-[30rem] -translate-y-1/2 rounded-full opacity-[0.14] blur-[150px]"
              style={{
                background: withHash(
                  "teamColour" in leader ? leader.teamColour : leader.colour
                ),
              }}
            />
          )}

          <div className="relative mx-auto max-w-375 px-8 pb-10 pt-20">
            <div className="flex flex-wrap items-end justify-between gap-6 border-b border-neutral-900 pb-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-neutral-500">
                {season}
                <span className="mx-3 text-neutral-700">/</span>
                Standings
              </p>

              {data?.round !== null && data?.round !== undefined && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                  After Round
                  <span className="mx-2 text-lg font-bold tabular-nums text-white">
                    {data.round}
                  </span>
                  {data.raceName && (
                    <span className="text-neutral-600">· {data.raceName}</span>
                  )}
                </p>
              )}
            </div>

            <h1 className="mt-10 text-7xl font-black uppercase leading-[0.85] tracking-tight md:text-9xl">
              CHAMPIONSHIP
              <span className="text-red-500">.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-400">
              Drivers' and constructors' standings, round by round, with the
              places won and lost at the last race.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-6">
              {/* Season */}
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

              <span className="hidden h-6 w-px bg-neutral-800 sm:block" />

              {/* Table */}
              <div className="inline-flex rounded-xl border border-neutral-800 bg-neutral-900 p-1">
                {(["drivers", "constructors"] as Table[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => setTable(option)}
                    className={`rounded-lg px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors duration-200 ${
                      option === table
                        ? "bg-red-600 text-white"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {option === "drivers" ? "Drivers" : "Constructors"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Standings */}
        <section className="mx-auto max-w-375 px-8 pb-24 pt-12">
          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900"
                />
              ))}
            </div>
          )}

          {error && <p className="text-red-400">{error}</p>}

          {!loading && !error && rows.length === 0 && (
            <p className="text-neutral-500">
              No championship data ingested for {season}.
            </p>
          )}

          {!loading && !error && rows.length > 0 && (
            <div className="space-y-1.5">
              {/* Column rail */}
              <div className="grid grid-cols-[3rem_2.5rem_1fr_auto] items-center gap-4 px-4 pb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600 sm:grid-cols-[3rem_2.5rem_1fr_10rem_auto]">
                <span>Pos</span>
                <span />
                <span>{table === "drivers" ? "Driver" : "Constructor"}</span>
                <span className="hidden text-right sm:block">This Round</span>
                <span className="text-right">Points</span>
              </div>

              {rows.map((row) => {
                const isDriver = "driverNumber" in row;
                const colour = withHash(
                  isDriver ? (row as DriverRow).teamColour : (row as ConstructorRow).colour
                );

                const name = isDriver
                  ? `${(row as DriverRow).lastName}`
                  : (row as ConstructorRow).name;

                const sub = isDriver
                  ? (row as DriverRow).team
                  : (row as ConstructorRow).country ?? "";

                const href = isDriver
                  ? `/drivers/${(row as DriverRow).driverNumber}`
                  : `/teams/${(row as ConstructorRow).slug}`;

                const iso = isDriver
                  ? getCountryIso((row as DriverRow).countryCode)
                  : null;

                return (
                  <Link
                    key={isDriver ? (row as DriverRow).driverNumber : (row as ConstructorRow).slug}
                    to={href}
                    className="group relative grid grid-cols-[3rem_2.5rem_1fr_auto] items-center gap-4 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 transition-colors duration-200 hover:border-neutral-600 sm:grid-cols-[3rem_2.5rem_1fr_10rem_auto]"
                  >
                    {/* Points bar, relative to the leader */}
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 transition-all duration-500"
                      style={{
                        width: `${(row.points / leaderPoints) * 100}%`,
                        background: `linear-gradient(90deg, ${colour}26 0%, transparent 100%)`,
                      }}
                    />

                    <span className="relative flex items-baseline gap-2">
                      <span className="font-mono text-xl font-black tabular-nums text-white">
                        {row.position}
                      </span>
                    </span>

                    <span className="relative">
                      <Movement change={row.positionChange} />
                    </span>

                    <span className="relative flex min-w-0 items-center gap-3">
                      <span
                        className="h-8 w-[3px] shrink-0 rounded-full"
                        style={{ backgroundColor: colour }}
                      />

                      {iso && (
                        <img
                          src={`https://flagcdn.com/24x18/${iso}.png`}
                          width={20}
                          height={15}
                          alt=""
                          className="hidden shrink-0 rounded-[2px] sm:block"
                        />
                      )}

                      <span className="min-w-0">
                        <span className="block truncate font-bold uppercase text-white">
                          {isDriver && (
                            <span className="mr-2 font-mono text-xs font-normal text-neutral-500">
                              {(row as DriverRow).driverNumber}
                            </span>
                          )}
                          {name}
                        </span>
                        <span className="block truncate font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                          {sub}
                        </span>
                      </span>
                    </span>

                    <span className="relative hidden text-right font-mono text-xs tabular-nums text-neutral-400 sm:block">
                      {row.pointsGained > 0 ? `+${row.pointsGained}` : "—"}
                    </span>

                    <span className="relative text-right font-mono text-2xl font-black tabular-nums text-white">
                      {row.points}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
