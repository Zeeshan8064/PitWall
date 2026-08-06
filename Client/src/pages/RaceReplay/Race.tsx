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
import {
  getCountryIso,
  formatDateFull,
  formatGap,
  resolveTrackShape,
} from "./F1utils";

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

  const podium = classification.slice(0, 3);

  // The hero takes the winning team's colour, so Monza in red reads
  // differently from Hungary in papaya. Falls back to the app red before the
  // classification lands.
  const heroColour = podium[0]?.driver?.teamColour
    ? `#${podium[0].driver.teamColour}`
    : "#e00400";

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

      <main className="min-h-screen bg-[#0A0A0A] px-8 pb-16 pt-24 text-white">
        <button
          onClick={() => navigate("/race-replay")}
          className="mb-6 flex items-center gap-1 text-sm text-neutral-400 transition-colors hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Race Replay
        </button>

        {/* Hero — carries the result, not just the metadata. The circuit is the
            backdrop, the winning team's colour lights it, and the podium says
            what actually happened. */}
        <section className="relative overflow-hidden border-b border-neutral-900">
          {/* Blueprint grid — the technical-drawing ground the circuit sits on */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.055]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 52px)," +
                "repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 52px)",
            }}
          />

          {/* Winner's team colour, so no two races look alike */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-[8%] top-1/2 h-[34rem] w-[34rem] -translate-y-1/2 rounded-full opacity-20 blur-[150px]"
            style={{ background: heroColour }}
          />

          {/* The circuit, drawing itself once on load — the same single lap of
              telemetry the outline was traced from. Keyed on the session so it
              re-runs when you switch weekends. */}
          <svg
            key={sessionKey}
            viewBox={trackShape.viewBox}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
            className="pointer-events-none absolute -right-10 top-1/2 hidden h-[150%] w-[42rem] -translate-y-1/2 lg:block"
            fill="none"
            style={{ color: heroColour }}
          >
            {/* Ghost of the full lap, so the shape is legible before and
                during the draw */}
            <path
              d={trackShape.path}
              stroke="currentColor"
              strokeWidth={trackShape.isReal ? 1.1 : 1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.12}
            />
            <path
              className="animate-trace"
              pathLength={1}
              d={trackShape.path}
              stroke="currentColor"
              strokeWidth={trackShape.isReal ? 1.6 : 2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.55}
              style={{ filter: `drop-shadow(0 0 14px ${heroColour})` }}
            />
          </svg>

          {/* Sinks the right edge so the circuit fades out rather than being
              cut off by the section boundary */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-40 lg:block"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #0A0A0A 85%)",
            }}
          />

          <div className="relative flex flex-wrap items-start justify-between gap-8">
            <div className="min-w-0 flex-1">
              {/* Top rail */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-neutral-900 pb-5 font-mono text-[11px] uppercase tracking-[0.35em] text-neutral-500">
                <span className="text-red-500">
                  {meta.round ? `Round ${meta.round}` : "Session"}
                </span>
                <span className="h-3 w-px bg-neutral-800" />
                <span>{meta.date ? formatDateFull(meta.date) : "—"}</span>

                {iso && (
                  <>
                    <span className="h-3 w-px bg-neutral-800" />
                    <span className="flex items-center gap-2">
                      <img
                        src={`https://flagcdn.com/24x18/${iso}.png`}
                        width={20}
                        height={15}
                        alt=""
                        className="rounded-[2px]"
                      />
                      {meta.country}
                    </span>
                  </>
                )}
              </div>

              <h1 className="mt-8 text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-7xl">
                {meta.raceName ?? `Session ${sessionKey}`}
                <span className="text-red-500">.</span>
              </h1>

              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.3em] text-neutral-500">
                {meta.circuit ?? "Circuit"}
                {meeting?.location && ` · ${meeting.location}`}
              </p>

              {/* Meeting -> available sessions -> selected session */}
              {context && (
                <SessionSelector
                  context={context}
                  selectedKey={Number(sessionKey)}
                  onSelect={selectSession}
                />
              )}
            </div>

            {/* Result. Only once the session has actually been classified —
                a future or still-loading session gets nothing rather than a
                row of dashes. */}
            {!isFutureSession && podium.length > 0 && (
              <div className="w-full shrink-0 pt-4 lg:w-80">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                  {isRacedSession ? "Podium" : "Top Three"}
                </p>

                <div className="mt-4 space-y-2">
                  {podium.map((row, index) => {
                    const colour = row.driver?.teamColour
                      ? `#${row.driver.teamColour}`
                      : "#525252";

                    return (
                      <div
                        key={row.driverNumber}
                        className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 backdrop-blur-sm"
                      >
                        <span
                          className="font-mono text-lg font-black tabular-nums"
                          style={{ color: colour }}
                        >
                          {index + 1}
                        </span>

                        <span
                          className="h-8 w-[3px] shrink-0 rounded-full"
                          style={{ backgroundColor: colour }}
                        />

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold uppercase text-white">
                            {row.driver?.lastName ?? `#${row.driverNumber}`}
                          </span>
                          <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                            {row.driver?.team ?? "—"}
                          </span>
                        </span>

                        {index > 0 && (
                          <span className="shrink-0 font-mono text-[11px] tabular-nums text-neutral-400">
                            {formatGap(row.gapToLeader)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="pb-8" />
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
