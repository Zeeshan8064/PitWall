import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import DriverCard from "./DriverCard";

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

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDrivers() {
      try {
        const response = await fetch(
          "http://localhost:5000/api/races/drivers"
        );

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

  // Group drivers by team (in order of first appearance) so teammates always
  // land next to each other in the 2-per-row grid, instead of whatever order
  // the API happens to return.
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

      <main className="min-h-screen bg-[#0A0A0A] text-white pt-8.5">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-neutral-900">
          {/* Background glow */}
          <div className="absolute left-1/2 top-0 h-125 w-125 -translate-x-1/2 rounded-full bg-red-600/10 blur-3xl" />

          {/* Background text */}
          <h2 className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 whitespace-nowrap text-[220px] font-black uppercase tracking-tight text-white/3">
            HELMET
          </h2>

          <div className="relative mx-auto flex max-w-7xl flex-col items-center px-8 pb-12 pt-24 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.5em] text-red-500">
              Driver Archive
            </p>

            <h1 className="mt-5 text-6xl font-black uppercase leading-[0.9] md:text-8xl">
              BEYOND
              <br />
              <span className="text-white">THE HELMET.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-neutral-400">
              Precision. Performance. Consistency. Discover every driver through
              data that goes beyond the final result.
            </p>

            <div className="mt-14 flex items-center gap-10 text-center">
              <div>
                <p className="text-4xl font-black text-white">
                  {drivers.length}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-neutral-500">
                  Drivers
                </p>
              </div>

              <div className="h-10 w-px bg-neutral-800" />

              <div>
                <p className="text-4xl font-black text-white">
                  {teamCount}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-neutral-500">
                  Teams
                </p>
              </div>

              <div className="h-10 w-px bg-neutral-800" />

              <div>
                <p className="text-4xl font-black text-white">24</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-neutral-500">
                  Races
                </p>
              </div>
            </div>

            <div className="mt-14 flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-neutral-500">
              <span className="h-px w-10 bg-neutral-700" />
              Scroll to explore
              <span className="h-px w-10 bg-neutral-700" />
            </div>
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
    </>
  );
}