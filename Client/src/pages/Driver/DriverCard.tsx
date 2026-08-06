import { Link } from "react-router-dom";
import { getCountryIso } from "../RaceReplay/F1utils";

interface DriverCardProps {
  driver: {
    driverNumber: number;
    firstName: string;
    lastName: string;
    acronym: string;
    team: string;
    teamColour: string;
    headshotUrl: string;
    countryCode: string | null;
  };
}

function withHash(colour: string) {
  if (!colour) return "#666666";

  return colour.startsWith("#") ? colour : `#${colour}`;
}

export default function DriverCard({ driver }: DriverCardProps) {
  const colour = withHash(driver.teamColour);

  // Shared resolver rather than a local table: this page previously carried
  // its own three-letter map that was missing half the grid, and rendered
  // flag *emoji*, which Windows/Chrome draws as plain letters.
  const iso = getCountryIso(driver.countryCode);

  return (
    <Link
      to={`/drivers/${driver.driverNumber}`}
      className="group relative block h-72 overflow-hidden rounded-[30px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      {/* Livery ground */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(105deg, #080808 0%, #101010 38%, ${colour} 100%)`,
        }}
      />

      <div
        className="absolute -right-25 top-1/2 h-95 w-95 -translate-y-1/2 rounded-full opacity-35 blur-[110px]"
        style={{ background: colour }}
      />

      {/* Instrument hairlines, matching the cards elsewhere in the app */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 44px)",
        }}
      />

      <div className="absolute inset-0 rounded-[30px] border border-white/10 transition-colors duration-300 group-hover:border-white/25" />

      {/* Identity */}
      <div className="relative z-20 flex h-full w-[46%] flex-col justify-between px-7 py-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/50">
            {driver.acronym}
          </p>

          <p className="mt-3 text-xl font-light leading-none text-white/80">
            {driver.firstName}
          </p>

          {/* Sized against length so long surnames stay on one line instead of
              wrapping over the render. */}
          <h2
            className="mt-1 font-black uppercase leading-[0.9] text-white"
            style={{
              fontSize: `min(2.6rem, ${Math.round(
                300 / Math.max(driver.lastName.length, 5)
              )}px)`,
            }}
          >
            {driver.lastName}
          </h2>

          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">
            {driver.team}
          </p>
        </div>

        <div className="flex items-end justify-between">
          <span
            className="font-mono text-6xl font-black italic leading-none text-transparent opacity-70"
            style={{ WebkitTextStroke: "1.5px rgba(255,255,255,.9)" }}
          >
            {driver.driverNumber}
          </span>

          {iso && (
            <img
              src={`https://flagcdn.com/24x18/${iso}.png`}
              srcSet={`https://flagcdn.com/48x36/${iso}.png 2x`}
              width={26}
              height={20}
              alt={driver.countryCode ?? ""}
              className="rounded-[3px] shadow-sm ring-1 ring-white/20"
            />
          )}
        </div>
      </div>

      {/* Driver render. One rule for everyone — the old per-driver offset table
          only covered four numbers and left the rest unpositioned. */}
      <img
        src={`/drivers/${driver.driverNumber}.png`}
        onError={(e) => {
          if (e.currentTarget.src !== driver.headshotUrl) {
            e.currentTarget.src = driver.headshotUrl;
          }
        }}
        alt=""
        className="pointer-events-none absolute -bottom-2 right-[8%] z-10 h-full w-auto object-contain object-bottom transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-105"
      />

      {/* Chevron */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="absolute bottom-6 right-6 z-20 h-5 w-5 -translate-x-1 text-white/60 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
      >
        <path
          d="M9 6l6 6-6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
