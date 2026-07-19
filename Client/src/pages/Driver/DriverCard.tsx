import { Link } from "react-router-dom";

// OpenF1's country_code is an IOC-style 3-letter code.
const COUNTRY_TO_ISO2: Record<string, string> = {
  GBR: "GB",
  ITA: "IT",
  MON: "MC",
  NED: "NL",
  ESP: "ES",
  FRA: "FR",
  GER: "DE",
  AUS: "AU",
  CAN: "CA",
  MEX: "MX",
  JPN: "JP",
  THA: "TH",
  DEN: "DK",
  FIN: "FI",
  CHN: "CN",
  USA: "US",
  BRA: "BR",
  NZL: "NZ",
  ARG: "AR",
  POL: "PL",
};

function flagEmoji(countryCode: string | null) {
  if (!countryCode) return null;

  const iso2 = COUNTRY_TO_ISO2[countryCode.toUpperCase()];
  if (!iso2) return null;

  return String.fromCodePoint(
    ...[...iso2].map((c) => 127397 + c.charCodeAt(0))
  );
}

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

const IMAGE_STYLE: Record<
  number,
  { right: string; height: string; bottom: string }
> = {
  1: { right: "10%", height: "100%", bottom: "-8px" }, // Verstappen
  4: { right: "10%", height: "100%", bottom: "-10px" }, // Norris
  16: { right: "10%", height: "100%", bottom: "-8px" }, // Leclerc
  81: { right: "10%", height: "100%", bottom: "-10px" }, // Piastri
};

export default function DriverCard({ driver }: DriverCardProps) {
  const flag = flagEmoji(driver.countryCode);

  const imageStyle = IMAGE_STYLE[driver.driverNumber] ?? {
    right: "10%",
    height: "100%",
    bottom: "-8px",
  };

  return (
    <Link
      to={`/drivers/${driver.driverNumber}`}
      className="group relative h-72 overflow-hidden rounded-[30px]"
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            105deg,
            #080808 0%,
            #111111 38%,
            ${driver.teamColour} 100%
          )`,
        }}
      />

      {/* Team glow */}
      <div
        className="absolute right-[-100px] top-1/2 h-[380px] w-[380px] -translate-y-1/2 rounded-full blur-[110px] opacity-35"
        style={{
          background: driver.teamColour,
        }}
      />

      {/* Texture */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,.9) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />

      {/* Border */}
      <div className="absolute inset-0 rounded-[30px] border border-white/10 transition-colors duration-300 group-hover:border-white/20" />

      {/* Text */}
      <div className="relative z-20 flex h-full w-[42%] flex-col justify-between px-7 py-6">
        <div>
          <p className="text-xl font-light text-white/80">
            {driver.firstName}
          </p>

          <h2 className="text-[42px] font-black leading-none text-white">
            {driver.lastName}
          </h2>

          <p className="mt-3 text-xs uppercase tracking-[0.35em] text-white/60">
            {driver.team}
          </p>
        </div>

        <div className="flex items-end justify-between">
          <span
            className="text-6xl font-black italic text-transparent opacity-60"
            style={{
              WebkitTextStroke: "1.5px rgba(255,255,255,.9)",
            }}
          >
            {driver.driverNumber}
          </span>

          {flag && (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur text-xl">
              {flag}
            </span>
          )}
        </div>
      </div>

      {/* Driver Render */}
      <img
        src={`/drivers/${driver.driverNumber}.png`}
        onError={(e) => {
          if (e.currentTarget.src !== driver.headshotUrl) {
            e.currentTarget.src = driver.headshotUrl;
          }
        }}
        alt={driver.acronym}
        style={{
          right: imageStyle.right,
          height: imageStyle.height,
          bottom: imageStyle.bottom,
        }}
        className="
          pointer-events-none
          absolute
          z-10
          w-auto
          object-contain
          object-bottom
          transition-all
          duration-500
          ease-out
          group-hover:scale-105
          group-hover:-translate-y-1
        "
      />
    </Link>
  );
}