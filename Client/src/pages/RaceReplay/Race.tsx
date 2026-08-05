import { useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import type { RaceMeta, SessionSummary } from "./raceTypes";
import { useRaceData } from "./useRaceData";
import { useSessionContext } from "./useSessionContext";
import SessionSelector from "./SessionSelector";
import {
  RaceStats,
  LapTimeChartSection,
  PitStopLog,
  ClassificationTable,
} from "./Racecomponents";
import { getCountryIso, formatDateFull, resolveTrackShape } from "./F1utils";

// Session types that are raced rather than run against the clock. Everything
// downstream keys off this rather than off the weekend, so adding a session
// type only means deciding which side of this line it falls on.
const RACED_SESSION_TYPES = ["Race", "Sprint"];

export default function Race() {
  const { sessionKey } = useParams<{ sessionKey: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // The list page passes the weekend it navigated from, which lets the hero
  // render immediately. The fetched context is authoritative once it lands,
  // and is the only source when the URL is opened directly.
  const passedMeta = (location.state as RaceMeta | undefined) ?? undefined;

  const { context, error: contextError } = useSessionContext(sessionKey);

  const meeting = context?.meeting;
  const selected = context?.selected ?? null;

  const meta: Partial<RaceMeta> = {
    raceName: meeting?.raceName ?? passedMeta?.raceName,
    circuit: meeting?.circuit ?? passedMeta?.circuit ?? undefined,
    country: meeting?.country ?? passedMeta?.country ?? undefined,
    countryCode: passedMeta?.countryCode ?? "",
    round: meeting?.round ?? passedMeta?.round,
    date: selected?.date ?? meeting?.date ?? passedMeta?.date,
  };

  // Prefer the backend's verdict for the *selected* session — a weekend's race
  // being in the past says nothing about a session that has not run.
  const isFutureSession =
    selected?.isFuture ??
    (meta.date ? new Date(meta.date) > new Date() : false);

  const isRacedSession = selected
    ? RACED_SESSION_TYPES.includes(selected.sessionType)
    : true;

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
  } = useRaceData(sessionKey, isFutureSession);

  const leader = classification[0];
  const activeDriverNumber = selectedDriverNumber ?? leader?.driverNumber ?? null;

  const iso = getCountryIso(meta.countryCode ?? "", meta.country ?? "");
  const trackShape = resolveTrackShape(
    meeting?.circuitOutline,
    meta.circuit ?? sessionKey ?? "default"
  );

  // The URL is the single source of truth for which session is shown, so
  // switching is a navigation. Replacing rather than pushing keeps Back
  // pointing at the race list instead of walking the sessions in reverse.
  const selectSession = (session: SessionSummary) => {
    setSelectedDriverNumber(null);

    navigate(`/race/${session.sessionKey}`, {
      state: passedMeta,
      replace: true,
    });
  };

  return (
    <>
      <Navbar/>

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
            viewBox={trackShape.viewBox}
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-none absolute -right-6 -top-6 h-64 w-96 text-neutral-800 opacity-60"
            fill="none"
          >
            <path
              d={trackShape.path}
              stroke="currentColor"
              // Traced outlines carry far more detail than the doodles, so a
              // thinner stroke keeps the corners from filling in.
              strokeWidth={trackShape.isReal ? 1.4 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="relative z-10 flex items-center gap-3">
            {iso ? (
              <img src={`https://flagcdn.com/48x36/${iso}.png`} width={36} height={27} alt={meta.country ?? ""} className="rounded-[3px] shadow-sm" />
            ) : (
              <span className="flex h-6.75 w-9 items-center justify-center rounded-[3px] bg-neutral-800 text-xs text-neutral-500">?</span>
            )}
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-500">
              {meta.round ? `Round ${meta.round}` : "Race"}
              {meta.date && <span className="ml-2 font-medium text-neutral-500">{formatDateFull(meta.date)}</span>}
            </p>
          </div>

          <h1 className="relative z-10 mt-2 text-5xl font-black uppercase leading-none sm:text-6xl">
            {meta.raceName ?? `Session ${sessionKey}`}
            <span className="text-red-500">.</span>
          </h1>

          <p className="relative z-10 mt-4 text-lg text-neutral-400">
            {selected && (
              <span className="font-semibold text-neutral-200">{selected.label}</span>
            )}
            {selected && " · "}
            {meta.circuit ?? "Circuit"}
            {meta.country && <>, {meta.country}</>}
          </p>

          {/* Meeting -> available sessions -> selected session */}
          {context && (
            <div className="relative z-10">
              <SessionSelector
                context={context}
                selectedKey={Number(sessionKey)}
                onSelect={selectSession}
              />
            </div>
          )}
        </section>

        {contextError && <div className="mt-10 text-red-400">{contextError}</div>}

        {/* Session not yet run */}
        {isFutureSession && (
          <div className="mt-16 flex flex-col items-center justify-center gap-4 py-20 text-center">
            <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12 text-neutral-700">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-2xl font-black text-white">
              {selected?.label ?? "Session"} Not Yet Run
            </p>
            <p className="max-w-sm text-neutral-500">
              {meta.date && (
                <>
                  Scheduled for <span className="text-neutral-300">{formatDateFull(meta.date)}</span>.{" "}
                </>
              )}
              Come back afterwards for full results, lap data, and analysis.
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !isFutureSession && (
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900" />
            ))}
          </div>
        )}

        {error && <div className="mt-10 text-red-400">{error}</div>}

        {/* Session content — identical components for every session type */}
        {!isFutureSession && !loading && !error && (
          <>
            <RaceStats
              winner={leader}
              fastestLap={fastestLap}
              fastestPitStop={fastestPitStop}
              fastestSectors={fastestSectors}
              leaderLabel={isRacedSession ? "Winner" : "Pole"}
              showStartPosition={isRacedSession}
              showPitStop={isRacedSession}
            />

            {classification.length > 0 && (
              <LapTimeChartSection
                classification={classification}
                activeDriverNumber={activeDriverNumber}
                onSelectDriver={setSelectedDriverNumber}
                buildLapSeries={buildLapSeries}
                // Marking the stops is what turns a jagged line into a
                // readable stint-by-stint story.
                pitLaps={pitLog
                  .filter((entry) => entry.stop.driverNumber === activeDriverNumber)
                  .map((entry) => entry.stop.lapNumber)}
              />
            )}

            {(isRacedSession || pitLog.length > 0) && <PitStopLog pitLog={pitLog} />}

            <ClassificationTable classification={classification} />
          </>
        )}
      </main>
      <Footer/>
    </>
  );
}
