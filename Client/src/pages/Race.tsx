import { useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import type { RaceMeta } from "./raceTypes";
import { useRaceData } from "./useRaceData";
import {
  RaceStats,
  LapTimeChartSection,
  PitStopLog,
  ClassificationTable,
} from "./Racecomponents";
import { getCountryIso, formatDateFull, getTrackShape } from "./F1utils";

export default function Race() {
  const { sessionKey } = useParams<{ sessionKey: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const meta = (location.state as RaceMeta | undefined) ?? undefined;
  const isFutureRace = meta?.date ? new Date(meta.date) > new Date() : false;

  const [selectedDriverNumber, setSelectedDriverNumber] = useState<number | null>(null);

  const {
    loading,
    error,
    classification,
    fastestLap,
    fastestSectors,
    fastestPitStop,
    pitLog,
    buildLapSeries,
  } = useRaceData(sessionKey, isFutureRace);

  const winner = classification[0];
  const activeDriverNumber = selectedDriverNumber ?? winner?.driverNumber ?? null;

  const iso = meta ? getCountryIso(meta.countryCode, meta.country) : null;
  const trackShape = getTrackShape(meta?.circuit ?? sessionKey ?? "default");

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0A0A0A] px-8 pb-16 pt-28 text-white">
        <button
          onClick={() => navigate("/race-replay")}
          className="mb-6 flex items-center gap-1 text-sm text-neutral-400 transition-colors hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Race Replay
        </button>

        {/* Hero */}
        <section className="relative overflow-hidden border-b border-neutral-800 pb-10">
          <svg
            viewBox="0 0 120 75"
            className="pointer-events-none absolute -right-6 -top-6 h-64 w-96 text-neutral-800 opacity-60"
            fill="none"
          >
            <path d={trackShape} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <div className="relative z-10 flex items-center gap-3">
            {iso ? (
              <img src={`https://flagcdn.com/48x36/${iso}.png`} width={36} height={27} alt={meta?.country ?? ""} className="rounded-[3px] shadow-sm" />
            ) : (
              <span className="flex h-6.75 w-9 items-center justify-center rounded-[3px] bg-neutral-800 text-xs text-neutral-500">?</span>
            )}
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-500">
              {meta?.round ? `Round ${meta.round}` : "Race"}
              {meta?.date && <span className="ml-2 font-medium text-neutral-500">{formatDateFull(meta.date)}</span>}
            </p>
          </div>

          <h1 className="relative z-10 mt-2 text-5xl font-black uppercase leading-none sm:text-6xl">
            {meta?.raceName ?? `Session ${sessionKey}`}
            <span className="text-red-500">.</span>
          </h1>

          <p className="relative z-10 mt-4 text-lg text-neutral-400">
            {meta?.circuit ?? "Circuit"}
            {meta?.country && <>, {meta.country}</>}
          </p>
        </section>

        {/* Future race */}
        {isFutureRace && (
          <div className="mt-16 flex flex-col items-center justify-center gap-4 py-20 text-center">
            <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12 text-neutral-700">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-2xl font-black text-white">Race Not Yet Run</p>
            <p className="max-w-sm text-neutral-500">
              Scheduled for <span className="text-neutral-300">{formatDateFull(meta!.date)}</span>.
              Come back after the race for full results, lap data, and strategy analysis.
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900" />
            ))}
          </div>
        )}

        {error && <div className="mt-10 text-red-400">{error}</div>}

        {/* Race content */}
        {!isFutureRace && !loading && !error && (
          <>
            <RaceStats
              winner={winner}
              fastestLap={fastestLap}
              fastestPitStop={fastestPitStop}
              fastestSectors={fastestSectors}
            />

            {classification.length > 0 && (
              <LapTimeChartSection
                classification={classification}
                activeDriverNumber={activeDriverNumber}
                onSelectDriver={setSelectedDriverNumber}
                buildLapSeries={buildLapSeries}
              />
            )}

            <PitStopLog pitLog={pitLog} />

            <ClassificationTable classification={classification} />
          </>
        )}
      </main>
    </>
  );
}