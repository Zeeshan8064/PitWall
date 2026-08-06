import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import DriverCard from "./DriverCard";
import { API_BASE } from "../../lib/api";

interface Driver {
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

// The season the grid is shown for. Matches DRIVERS_PAGE_SEASON on the server,
// which is what /drivers returns.
const SEASON = 2026;

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDrivers() {
      try {
        const response = await fetch(`${API_BASE}/api/races/drivers`);

        if (!response.ok) {
          throw new Error("Failed to fetch drivers");
        }

        const data = await response.json();

        setDrivers(data.drivers);
      } catch (err) {
        console.error(err);
        setError("Unable to load drivers.");
      } finally {
        setLoading(false);
      }
    }

    loadDrivers();
  }, []);

  const teamCount = useMemo(
    () => new Set(drivers.map((driver) => driver.team)).size,
    [drivers]
  );

  // Nationalities represented on the grid. Replaces a hardcoded "24 Races"
  // that was never derived from anything.
  const nationCount = useMemo(
    () =>
      new Set(
        drivers.map((driver) => driver.countryCode).filter(Boolean)
      ).size,
    [drivers]
  );
  const groupedDrivers = useMemo(() => {
    const byTeam = new Map<string, Driver[]>();

    for (const driver of drivers) {
      const teammates = byTeam.get(driver.team) ?? [];
      teammates.push(driver);
      byTeam.set(driver.team, teammates);
    }

    return Array.from(byTeam.values()).flat();
  }, [drivers]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0A0A0A] text-white pt-9">
        {/* Hero — left-aligned instrument panel, matching Teams and Race
            Replay rather than the centred marketing treatment. */}
        <section className="relative overflow-hidden border-b border-neutral-900">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 56px)",
            }}
          />

          <div className="relative mx-auto max-w-375 px-8 pb-10 pt-20">
            {/* Top rail */}
            <div className="flex flex-wrap items-end justify-between gap-6 border-b border-neutral-900 pb-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-neutral-500">
                {SEASON}
                <span className="mx-3 text-neutral-700">/</span>
                Drivers
              </p>

              <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                <span>
                  <span className="mr-2 text-lg font-bold tabular-nums text-white">
                    {drivers.length}
                  </span>
                  Drivers
                </span>
                <span className="h-4 w-px bg-neutral-800" />
                <span>
                  <span className="mr-2 text-lg font-bold tabular-nums text-white">
                    {teamCount}
                  </span>
                  Teams
                </span>
                <span className="h-4 w-px bg-neutral-800" />
                <span>
                  <span className="mr-2 text-lg font-bold tabular-nums text-white">
                    {nationCount}
                  </span>
                  Nations
                </span>
              </div>
            </div>

            <h1 className="mt-10 text-7xl font-black uppercase leading-[0.85] tracking-tight md:text-9xl">
              THE FIELD
              <span className="text-red-500">.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-400">
              Every seat on the {SEASON} grid, and the season behind it — form,
              finishes and championship position, round by round.
            </p>

            {/* Number strip: every car number in its team colour, jumping
                straight to that driver. A signature only this page can have,
                since it is drawn from the grid itself. */}
            {drivers.length > 0 && (
              <div className="mt-12">
                <div className="flex flex-wrap gap-1.5">
                  {[...drivers]
                    .sort((a, b) => a.driverNumber - b.driverNumber)
                    .map((driver) => (
                      <Link
                        key={driver.driverNumber}
                        to={`/drivers/${driver.driverNumber}`}
                        title={`${driver.fullName} · ${driver.team}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border font-mono text-xs font-bold tabular-nums text-neutral-300 transition-all duration-200 hover:scale-110 hover:text-white"
                        style={{
                          borderColor: driver.teamColour
                            ? `${driver.teamColour}66`
                            : "#404040",
                          backgroundColor: driver.teamColour
                            ? `${driver.teamColour}1a`
                            : "transparent",
                        }}
                      >
                        {driver.driverNumber}
                      </Link>
                    ))}
                </div>

                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">
                  Select a number
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Drivers Grid */}
        <section className="mx-auto max-w-375 px-8 py-24">
          {loading && (
            <p className="text-center text-neutral-500">
              Loading drivers...
            </p>
          )}

          {error && (
            <p className="text-center text-red-500">
              {error}
            </p>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {groupedDrivers.map((driver) => (
                <DriverCard
                  key={driver.driverNumber}
                  driver={driver}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer/>
    </>
  );
}