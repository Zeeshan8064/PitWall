import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getCountryIso, formatDateShort, TRACK_SHAPES } from "./F1utils";
import Navbar from "../../components/Navbar"
import Footer from "../../components/Footer"

const API_BASE = "http://localhost:5000";
const SEASONS = ["2026", "2025", "2024", "2023"];

interface Race {
  sessionKey: number;
  round: number;
  raceName: string;
  circuit: string;
  location: string;
  country: string;
  countryCode: string;
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

  return (
    <>
    <Navbar/>
    <div className="min-h-screen bg-[#0A0A0A] p-8">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-neutral-800 pb-8">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-red-500">
            Season Archive
          </p>

          <h1 className="text-5xl font-black leading-none text-white sm:text-6xl">
            RACE
            <span className="text-red-500">.</span> REPLAY
            <span className="text-red-500">.</span>
          </h1>

          <p className="mt-3 max-w-md text-neutral-400">
            Relive every Grand Prix.{" "}
            <span className="text-neutral-200">Select a race to begin.</span>
          </p>
        </div>

        <div className="relative">
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="appearance-none rounded-xl border border-neutral-700 bg-neutral-900 py-3 pl-4 pr-10 text-sm font-semibold text-white transition-colors duration-200 hover:border-red-500 focus:border-red-500 focus:outline-none"
          >
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {s} Season
              </option>
            ))}
          </select>

          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

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
            const trackShape = TRACK_SHAPES[index % TRACK_SHAPES.length];

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
                  viewBox="0 0 120 75"
                  className="pointer-events-none absolute -right-3 -top-1 h-24 w-40 text-neutral-700 opacity-40 transition-colors duration-300 group-hover:text-red-500/60"
                  fill="none"
                >
                  <path
                    d={trackShape}
                    stroke="currentColor"
                    strokeWidth="2.5"
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
    <Footer/>
    </>
  );
}

export default RaceReplay;