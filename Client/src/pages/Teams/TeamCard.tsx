import { useState } from "react";
import { Link } from "react-router-dom";

export interface TeamCardTeam {
  name: string;
  slug: string;
  shortName: string | null;
  country: string | null;
  color: string;
}

export interface TeamCardDriver {
  driverNumber: number;
  firstName: string;
  lastName: string;
  fullName: string;
}

interface Props {
  team: TeamCardTeam;
  drivers: TeamCardDriver[];
}

// Assets are dropped in by hand — there is no API source for either. A team
// without them still renders a complete card, it just loses the artwork.
//
// AVIF because that is what the source renders are, and they already carry an
// alpha plane. Every browser that supports AVIF at all supports its alpha.
const carSrc = (slug: string) => `/teams/cars/${slug}.avif`;

// Logos get collected from several places, so the format varies per team —
// Wikipedia hands out SVG, most logo sites give PNG or WebP. Rather than
// forcing one, try each in turn and fall back to the team name if none load.
const LOGO_FORMATS = ["webp", "svg", "png"] as const;

const logoSrc = (slug: string, format: string) =>
  `/teams/logos/${slug}.${format}`;

function withHash(color: string) {
  if (!color) return "#666666";

  return color.startsWith("#") ? color : `#${color}`;
}

export default function TeamCard({ team, drivers }: Props) {
  const [carFailed, setCarFailed] = useState(false);
  // Index into LOGO_FORMATS; past the end means no format loaded.
  const [logoFormat, setLogoFormat] = useState(0);

  const logoFailed = logoFormat >= LOGO_FORMATS.length;

  const color = withHash(team.color);

  return (
    <Link
      to={`/teams/${team.slug}`}
      aria-label={`${team.name} team page`}
      className="group relative block overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 transition-colors duration-300 hover:border-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      {/* Team colour reduced to a single accent rule rather than a colour
          field — the card stays part of the app's dark surface. */}
      <span
        className="absolute left-0 top-0 z-20 h-full w-[3px]"
        style={{ backgroundColor: color }}
      />

      {/* Instrument-panel hairline grid, barely visible */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 48px)",
        }}
      />

      {/* Car as a ghosted background element, not the hero. The mask fades it
          out toward the text so it never competes with the names. */}
      {!carFailed && (
        <div className="pointer-events-none absolute right-0 top-0 h-full w-[62%]">
          <img
            src={carSrc(team.slug)}
            alt=""
            onError={() => setCarFailed(true)}
            className="h-full w-full object-contain object-right opacity-20 transition-opacity duration-300 group-hover:opacity-35"
            style={{
              maskImage: "linear-gradient(90deg, transparent 0%, #000 45%)",
              WebkitMaskImage:
                "linear-gradient(90deg, transparent 0%, #000 45%)",
            }}
          />
        </div>
      )}

      <div className="relative z-10 px-6 py-5 sm:px-7">
        {/* Header rail */}
        <div className="flex items-center justify-end gap-4">
          <div className="flex items-center gap-2.5">
            {!logoFailed && (
              <img
                // Keyed so a format change remounts the element; without it the
                // browser can hold onto the failed request and never retry.
                key={LOGO_FORMATS[logoFormat]}
                src={logoSrc(team.slug, LOGO_FORMATS[logoFormat])}
                alt=""
                onError={() => setLogoFormat((index) => index + 1)}
                // Sources are 48px, so this is kept at native size or under —
                // scaling them up would visibly soften the mark.
                className="h-8 w-8 object-contain"
              />
            )}

            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">
              {team.shortName ?? team.name.slice(0, 3)}
            </span>
          </div>
        </div>

        {/* Identity */}
        <h3 className="mt-4 text-3xl font-black uppercase leading-none tracking-tight text-white sm:text-4xl">
          {team.name}
        </h3>

        {team.country && (
          <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
            {team.country}
          </p>
        )}

        {/* Seats, as a readout rather than a name plate */}
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
          {drivers.length === 0 && (
            <span className="font-mono text-xs text-neutral-600">
              NO DRIVERS ON RECORD
            </span>
          )}

          {drivers.map((driver) => (
            <div key={driver.driverNumber} className="flex items-baseline gap-3">
              <span
                className="font-mono text-lg font-bold tabular-nums"
                style={{ color }}
              >
                {String(driver.driverNumber).padStart(2, "0")}
              </span>

              <span className="text-base font-medium text-neutral-300">
                {driver.firstName}{" "}
                <span className="font-bold uppercase text-white">
                  {driver.lastName}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* Footer rail */}
        <div className="mt-5 flex items-center justify-end border-t border-neutral-800/80 pt-3">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500 transition-colors duration-300 group-hover:text-white">
            View Team
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
