import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getCountryIso, formatDateShort, resolveTrackShape } from "./F1utils";
import Navbar from "../../components/Navbar"
import Footer from "../../components/Footer"
import { API_BASE } from "../../lib/api";

// Matches what the database actually holds. 2023 was deliberately excluded
// from the rebuild — its data was bad — so offering it would only ever return
// an empty season.
const SEASONS = ["2026", "2025", "2024"];

interface Race {
  sessionKey: number;
  // The weekend, which the replay page expands into its full session list.
  meetingKey: number;
  round: number;
  raceName: string;
  circuit: string;
  location: string;
  country: string;
  countryCode: string;
  circuitOutline: string | null;
  date: string;
}

function RaceReplay() {
  const [season, setSeason] = useState("2026");
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRaces = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_BASE}/api/races/season/${season}`);
        setRaces(res.data.races);
      } catch {
        setError("Failed to load races");
      } finally {
        setLoading(false);
      }
    };
    fetchRaces();
  }, [season]);

  // A season in progress is the normal case, so the hero states how much of it
  // has actually happened rather than implying the whole calendar is watchable.
  const calendar = useMemo(() => {
    const now = new Date();
    const completed = races.filter((race) => new Date(race.date) <= now).length;

    return {
      total: races.length,
      completed,
      upcoming: races.length - completed,
    };
  }, [races]);

  return (
    <>
    <Navbar/>
    <main className="min-h-screen bg-[#0A0A0A]">
      {/* Hero — left-aligned instrument panel, matching Teams and the driver
          dossier rather than the centred treatment used on marketing pages. */}
      <section className="relative border-b border-neutral-900">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 56px)",
          }}
        />

        <div className="relative mx-auto max-w-375 px-8 pb-10 pt-24">
          {/* Top rail: what you are looking at, and the shape of it */}
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-neutral-900 pb-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-neutral-500">
              {season}
              <span className="mx-3 text-neutral-700">/</span>
              Calendar
            </p>

            <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              <span>
                <span className="mr-2 text-lg font-bold tabular-nums text-white">
                  {calendar.total}
                </span>
                Rounds
              </span>
              <span className="h-4 w-px bg-neutral-800" />
              <span>
                <span className="mr-2 text-lg font-bold tabular-nums text-white">
                  {calendar.completed}
                </span>
                Run
              </span>
              <span className="h-4 w-px bg-neutral-800" />
              <span>
                <span className="mr-2 text-lg font-bold tabular-nums text-white">
                  {calendar.upcoming}
                </span>
                Upcoming
              </span>
            </div>
          </div>

          <h1 className="mt-10 text-7xl font-black uppercase leading-[0.85] tracking-tight text-white md:text-9xl">
            RACE REPLAY
            <span className="text-red-500">.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-400">
            Every session of every weekend — race, qualifying and sprint —
            rebuilt from timing data lap by lap.
          </p>

          {/* Season selector, as pills to match the session selector on the
              replay page itself rather than a native dropdown. */}
          <div className="mt-9 flex flex-wrap gap-2">
            {SEASONS.map((s) => {
              const isActive = s === season;

              return (
                <button
                  key={s}
                  onClick={() => setSeason(s)}
                  className={`rounded-xl border px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors duration-200 ${
                    isActive
                      ? "border-red-500 bg-red-500/10 text-white"
                      : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          {/* Calendar strip — one cell per round, filled once it has been run.
              Gives the season's shape at a glance and jumps straight to a
              weekend, which no amount of scrolling the grid does. */}
          {calendar.total > 0 && (
            <div className="mt-10">
              <div className="flex flex-wrap gap-1">
                {races.map((race, index) => {
                  const isRun = new Date(race.date) <= new Date();

                  return (
                    <button
                      key={race.sessionKey}
                      onClick={() =>
                        navigate(`/race/${race.sessionKey}`, {
                          state: { ...race, round: race.round ?? index + 1 },
                        })
                      }
                      title={`Round ${race.round ?? index + 1} — ${race.raceName} · ${formatDateShort(race.date)}${isRun ? "" : " (upcoming)"}`}
                      className={`h-7 w-3 rounded-[2px] transition-all duration-200 hover:scale-y-125 ${
                        isRun
                          ? "bg-red-500/70 hover:bg-red-500"
                          : "border border-neutral-800 bg-neutral-900 hover:border-neutral-600"
                      }`}
                    />
                  );
                })}
              </div>

              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">
                {calendar.completed} of {calendar.total} run · select a round
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-375 px-8 pb-24 pt-12">
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900"
            />
          ))}
        </div>
      )}

      {error && <div className="text-red-400">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {races.map((race, index) => {
            const trackShape = resolveTrackShape(race.circuitOutline, index);

            return (
              <div
                key={race.sessionKey}
                onClick={() =>
                  navigate(`/race/${race.sessionKey}`, {
                    state: { ...race, round: race.round ?? index + 1 },
                  })
                }
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition-all duration-300 hover:border-red-500 hover:bg-neutral-900/70"
              >
                {/* Decorative circuit outline */}
                <svg
                  viewBox={trackShape.viewBox}
                  preserveAspectRatio="xMidYMid meet"
                  className="pointer-events-none absolute -right-3 -top-1 h-24 w-40 text-neutral-700 opacity-40 transition-colors duration-300 group-hover:text-red-500/60"
                  fill="none"
                >
                  <path
                    d={trackShape.path}
                    stroke="currentColor"
                    strokeWidth={trackShape.isReal ? 2 : 2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Round + date */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-red-500">
                    Round {race.round ?? index + 1}
                  </span>
                  <span className="text-xs font-medium text-neutral-500">
                    {formatDateShort(race.date)}
                  </span>
                </div>

                {/* Flag + race name + country, all on one line */}
                <div className="relative z-10 mt-4 flex items-center gap-2 pr-10">
                  {(() => {
                    const iso = getCountryIso(race.countryCode, race.country);
                    return iso ? (
                      <img
                        src={`https://flagcdn.com/24x18/${iso}.png`}
                        srcSet={`https://flagcdn.com/48x36/${iso}.png 2x`}
                        width={24}
                        height={18}
                        alt={race.country}
                        className="shrink-0 rounded-xs shadow-sm"
                      />
                    ) : (
                      <span className="flex h-4.5 w-6 shrink-0 items-center justify-center rounded-xs bg-neutral-700 text-[10px] text-neutral-400">
                        ?
                      </span>
                    );
                  })()}

                  <h3 className="text-lg font-bold leading-tight text-white">
                    {race.raceName}
                    <span className="text-sm font-normal text-neutral-400">
                      , {race.country}
                    </span>
                  </h3>
                </div>

                {/* Hover chevron */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="absolute bottom-5 right-5 h-5 w-5 -translate-x-1 text-neutral-600 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-red-500 group-hover:opacity-100"
                >
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </main>
    <Footer/>
    </>
  );
}

export default RaceReplay;