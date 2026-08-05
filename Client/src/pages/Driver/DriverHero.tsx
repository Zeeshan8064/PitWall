import { useState } from "react";
import { Link } from "react-router-dom";
import { getCountryIso } from "../RaceReplay/F1utils";

export interface HeroDriver {
  driverNumber: number;
  acronym: string;
  firstName: string;
  lastName: string;
  fullName: string;
  team: string;
  teamColour: string;
  headshotUrl: string;
  countryCode: string | null;
}

export interface TimelineEntry {
  round: number;
  raceName: string;
  finishPosition: number | null;
  status: string | null;
  points: number | null;
}

interface Props {
  driver: HeroDriver;
  season: number | null;
  championship: { position: number | null; points: number } | null;
  stats: { wins: number; podiums: number; poles: number } | null;
  timeline: TimelineEntry[];
  teamSlug: string | null;
}

// Result classes for the season strip. Ordered best to worst so the legend and
// the cells stay in step.
function resultTone(entry: TimelineEntry) {
  if (entry.status === "DNF" || entry.status === "DSQ") return "dnf";
  if (entry.finishPosition === null) return "none";
  if (entry.finishPosition === 1) return "win";
  if (entry.finishPosition <= 3) return "podium";
  if ((entry.points ?? 0) > 0) return "points";

  return "finish";
}

export default function DriverHero({
  driver,
  season,
  championship,
  stats,
  timeline,
  teamSlug,
}: Props) {
  const [logoFailed, setLogoFailed] = useState(false);

  const color = driver.teamColour?.startsWith("#")
    ? driver.teamColour
    : `#${driver.teamColour}`;

  const iso = getCountryIso(driver.countryCode);

  // Only rounds that have happened. A season in progress should not draw a row
  // of empty cells for races nobody has run.
  const raced = timeline.filter(
    (entry) => entry.finishPosition !== null || entry.status !== null
  );

  const toneStyle = (tone: string): React.CSSProperties => {
    switch (tone) {
      case "win":
        return { backgroundColor: color, boxShadow: `0 0 12px ${color}` };
      case "podium":
        return { backgroundColor: color, opacity: 0.6 };
      case "points":
        return { backgroundColor: color, opacity: 0.28 };
      case "finish":
        return { backgroundColor: "#404040" };
      case "dnf":
        return { backgroundColor: "#7f1d1d" };
      default:
        return { backgroundColor: "#1c1c1c" };
    }
  };

  return (
    <section className="relative min-h-[500px] overflow-hidden">
      {/* Stage: team-colour spotlight behind the subject, vignette at the
          edges, and the hairline grid used across the app's cards. */}
      <div
        className="absolute right-[22%] top-[35%] h-[44rem] w-[44rem] -translate-y-1/2 rounded-full opacity-25 blur-[190px]"
        style={{ background: color }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 64px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(75% 65% at 65% 45%, transparent 0%, rgba(0,0,0,0.5) 72%, rgba(0,0,0,0.92) 100%)",
        }}
      />

      {/* Number, stroked like a livery decal */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 select-none font-black leading-none"
        style={{
          // Capped well below the old 46vw: on a wide screen that rendered a
          // glyph taller than the whole hero, so it clipped top and bottom
          // instead of reading as a decal.
          fontSize: "clamp(9rem, 24vw, 21rem)",
          color: "transparent",
          WebkitTextStroke: `3px ${color}`,
          filter: `drop-shadow(0 0 40px ${color})`,
          opacity: 0.5,
        }}
      >
        {driver.driverNumber}
      </span>

      {/* Driver */}
      <img
        src={`/drivers/${driver.driverNumber}.png`}
        onError={(e) => {
          if (e.currentTarget.src !== driver.headshotUrl) {
            e.currentTarget.src = driver.headshotUrl;
          }
        }}
        alt={driver.fullName}
        className="pointer-events-none absolute bottom-0 left-[68%] z-10 h-[78%] w-auto object-contain object-bottom drop-shadow-[0_25px_60px_rgba(0,0,0,0.85)]"
      />

      {/* Dossier */}
      {/* Top padding clears the fixed navbar (top-5 + h-16 ≈ 84px) while the
          hero's own background still runs full-bleed behind it. */}
      <div className="relative z-30 max-w-2xl px-6 pb-10 pt-24 sm:px-10">
        <Link
          to="/drivers"
          className="mb-5 flex w-fit items-center gap-1 text-sm text-neutral-400 transition-colors hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Drivers
        </Link>

        <div className="flex items-center gap-3">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.4em]"
            style={{ color }}
          >
            Driver
          </span>
          <span className="h-px w-10 bg-white/20" />
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-neutral-500">
            {season ?? "—"} Season
          </span>

          {teamSlug && !logoFailed && (
            <img
              src={`/teams/logos/${teamSlug}.webp`}
              alt=""
              onError={() => setLogoFailed(true)}
              className="ml-1 h-6 w-6 object-contain"
            />
          )}
        </div>

        <p className="mt-5 text-3xl font-light leading-none text-neutral-300 sm:text-4xl">
          {driver.firstName}
        </p>
        <h1 className="mt-1 text-6xl font-black uppercase leading-[0.85] tracking-tight text-white sm:text-8xl">
          {driver.lastName}
        </h1>

        {/* Identity rail */}
        <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 border-y border-white/10 py-4 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">
          <span className="flex items-baseline gap-2">
            <span
              className="text-xl font-black tabular-nums"
              style={{ color }}
            >
              {driver.driverNumber}
            </span>
            {driver.acronym}
          </span>

          <span className="text-neutral-300">{driver.team}</span>

          {iso && (
            <span className="flex items-center gap-2">
              <img
                src={`https://flagcdn.com/24x18/${iso}.png`}
                width={20}
                height={15}
                alt=""
                className="rounded-[2px]"
              />
              {driver.countryCode}
            </span>
          )}
        </div>

        {/* Season headline figures */}
        <div className="mt-5 flex flex-wrap items-end gap-x-9 gap-y-4">
          {championship?.position != null && (
            <div>
              <p className="text-4xl font-black leading-none" style={{ color }}>
                P{championship.position}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                Championship
              </p>
            </div>
          )}

          {championship && (
            <div>
              <p className="text-4xl font-black leading-none tabular-nums text-white">
                {championship.points}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                Points
              </p>
            </div>
          )}

          {stats && (
            <div>
              <p className="text-4xl font-black leading-none tabular-nums text-white">
                {stats.wins}
                <span className="text-neutral-600"> / </span>
                {stats.podiums}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                Wins / Podiums
              </p>
            </div>
          )}
        </div>

        {/* Season strip — one cell per round, coloured by result. This is the
            part a static poster cannot have: the whole season at a glance. */}
        {raced.length > 0 && (
          <div className="mt-7">
            <div className="flex flex-wrap gap-1">
              {raced.map((entry) => (
                <span
                  key={entry.round}
                  title={`R${entry.round} ${entry.raceName} — ${
                    entry.status === "DNF" || entry.status === "DSQ"
                      ? entry.status
                      : entry.finishPosition
                        ? `P${entry.finishPosition}`
                        : "—"
                  }${entry.points ? ` · ${entry.points} pts` : ""}`}
                  className="h-6 w-3 rounded-[2px] transition-transform duration-200 hover:scale-y-125"
                  style={toneStyle(resultTone(entry))}
                />
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[9px] uppercase tracking-[0.25em] text-neutral-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2 rounded-[2px]" style={toneStyle("win")} />
                Win
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2 rounded-[2px]" style={toneStyle("podium")} />
                Podium
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2 rounded-[2px]" style={toneStyle("points")} />
                Points
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2 rounded-[2px]" style={toneStyle("dnf")} />
                DNF
              </span>
              <span className="ml-auto normal-case tracking-normal">
                {raced.length} rounds
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Fills the base of the hero and signals the stats below. Sits under
          the driver render's layer so it never overlaps the figure. */}
      <div className="pointer-events-none absolute bottom-5 left-0 right-0 z-[5] flex justify-center">
        <span className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-neutral-600">
          <span className="h-px w-10 bg-neutral-700" />
          Scroll to view
          <span className="h-px w-10 bg-neutral-700" />
        </span>
      </div>
    </section>
  );
}
