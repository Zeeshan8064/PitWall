import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import PanelBackground from "./PanelBackground";
import { API_BASE } from "../lib/api";

const SEASON = 2026;

const COMPOUND_FILL: Record<string, string> = {
  SOFT: "#ef4444",
  MEDIUM: "#eab308",
  HARD: "#e5e5e5",
  INTERMEDIATE: "#22c55e",
  WET: "#3b82f6",
};

interface Console {
  sessionKey: number;
  raceName: string;
  round: number;
  season: number;
  raceLaps: number;
  pitLossSeconds: number;
  winner: {
    lastName: string;
    acronym: string;
    stints: { compound: string; lapStart: number; lapEnd: number }[];
  } | null;
  softDeg: number | null;
}

export default function Hero() {
  // The console shows the most recent race actually in the database. Nothing
  // here is invented — if the API cannot be reached the panel says so rather
  // than falling back to plausible-looking numbers.
  const [data, setData] = useState<Console | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const season = await axios.get(`${API_BASE}/api/races/season/${SEASON}`);

        const run = (season.data.races ?? []).filter(
          (race: { date: string }) => new Date(race.date) <= new Date()
        );

        const latest = run[run.length - 1];
        if (!latest) throw new Error("no races");

        const strategy = await axios.get(
          `${API_BASE}/api/races/${latest.sessionKey}/strategy`
        );

        if (cancelled) return;

        const model = strategy.data;
        const winner = model.actual?.find(
          (a: { finishPosition: number }) => a.finishPosition === 1
        );

        setData({
          sessionKey: model.sessionKey,
          raceName: model.raceName,
          round: model.round,
          season: model.season,
          raceLaps: model.raceLaps,
          pitLossSeconds: model.pitLossSeconds,
          winner: winner ?? null,
          softDeg:
            model.compounds?.find(
              (c: { compound: string }) => c.compound === "SOFT"
            )?.degPerLap ??
            model.compounds?.[0]?.degPerLap ??
            null,
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative box-border flex h-screen items-center overflow-hidden bg-[#050505] pb-16 pt-28">
      <PanelBackground variant="trace" glowX={74} />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-12 px-8 lg:flex-row lg:items-center lg:gap-16">
        {/* Statement */}
        <div className="max-w-xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-red-500">
            Formula 1 · Strategy Analysis
          </p>

          <h1 className="mt-6 text-6xl font-black uppercase leading-[0.85] tracking-tight md:text-8xl">
            Box.
            <br />
            Push.
            <br />
            Undercut
            <span className="text-red-500">.</span>
          </h1>

          <p className="mt-8 text-xl leading-8 text-neutral-300">
            The language of the pit wall.
          </p>

          <p className="mt-4 max-w-lg leading-8 text-neutral-500">
            Every stint, every stop and every tyre call from three seasons of
            racing — rebuilt from timing data and modelled lap by lap.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/race-replay"
              className="rounded-xl bg-red-600 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-red-500"
            >
              Explore a race
            </Link>

            <Link
              to="/simulator"
              className="rounded-xl border border-neutral-700 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-300 transition-colors duration-200 hover:border-neutral-500 hover:text-white"
            >
              Run a strategy
            </Link>
          </div>
        </div>

        {/* Console — real data from the most recent ingested race */}
        <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-black/80 px-6 py-5 shadow-2xl backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-red-500">
              Race Console
            </span>
            <span
              className={`rounded px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] ${
                data
                  ? "bg-emerald-950 text-emerald-400"
                  : failed
                    ? "bg-neutral-900 text-neutral-500"
                    : "bg-neutral-900 text-neutral-600"
              }`}
            >
              {data ? "Live data" : failed ? "Offline" : "Loading"}
            </span>
          </div>

          {failed && (
            <p className="py-10 text-center text-sm text-neutral-600">
              Could not reach the API. Start the server to see the latest race.
            </p>
          )}

          {!failed && !data && (
            <div className="space-y-3 py-6">
              {[70, 45, 90].map((w) => (
                <div
                  key={w}
                  className="h-4 animate-pulse rounded bg-neutral-900"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          )}

          {data && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                Latest Session
              </p>
              <p className="mt-2 text-2xl font-black uppercase leading-none">
                {data.raceName}
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
                Round {data.round} · {data.season} · {data.raceLaps} laps
              </p>

              {data.winner && (
                <div className="mt-5 border-t border-neutral-800 pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                    Winner
                  </p>

                  <div className="mt-2 flex items-baseline justify-between gap-4">
                    <p className="text-xl font-black uppercase">
                      {data.winner.lastName}
                    </p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                      {data.winner.acronym}
                    </p>
                  </div>

                  <div className="mt-4 flex h-6 overflow-hidden rounded">
                    {data.winner.stints.map((stint, i) => {
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
                          title={`${stint.compound} · ${laps} laps`}
                        >
                          {laps > 4 ? laps : ""}
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-600">
                    Winning tyre strategy
                  </p>
                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-neutral-800 pt-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
                    Pit Loss
                  </p>
                  <p className="mt-1 font-mono text-lg font-black tabular-nums">
                    {data.pitLossSeconds.toFixed(1)}s
                  </p>
                </div>

                {data.softDeg !== null && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
                      Tyre Deg
                    </p>
                    <p className="mt-1 font-mono text-lg font-black tabular-nums">
                      {data.softDeg.toFixed(3)}
                      <span className="ml-1 text-[10px] font-normal text-neutral-500">
                        s/lap
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <Link
                to={`/race/${data.sessionKey}`}
                className="mt-5 flex items-center justify-between border-t border-neutral-800 pt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500 transition-colors hover:text-white"
              >
                Open this race
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
