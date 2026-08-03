import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DriverStats from "./DriverStats";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

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

export default function DriverProfile() {
  const { driverNumber } = useParams();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDriver() {
      try {
        const response = await fetch("http://localhost:5000/api/races/drivers");

        const data = await response.json();

        const selected = data.drivers.find(
          (d: Driver) => d.driverNumber === Number(driverNumber),
        );

        setDriver(selected ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadDriver();
  }, [driverNumber]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
          Loading...
        </main>
        <Footer />
      </>
    );
  }

  if (!driver) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
          Driver not found.
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[10vh] bg-[#0A0A0A] text-white pt-9" 
style={{
  background: `
    radial-gradient(
      circle at 85% 20%,
      ${driver.teamColour}33 0%,
      transparent 45%
    ),
    linear-gradient(
      110deg,
      #080808 0%,
      #111111 45%,
      ${driver.teamColour} 160%
    )
  `,
}}>
        <section className="relative overflow-hidden">
          {/* Team Glow */}
          <div
            className="absolute right-0 top-1/2 h-175 w-175 -translate-y-1/2 rounded-full blur-[180px] opacity-20"
            style={{ background: driver.teamColour }}
          />

          {/* Giant Driver Number */}
          <h1
            className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 text-[320px] font-black leading-none opacity-[0.04]"
            style={{ color: driver.teamColour }}
          >
            {driver.driverNumber}
          </h1>

          <div className="relative mx-auto flex max-w-7xl items-center justify-between px-8 py-16">
            {/* LEFT */}
            <div className="max-w-xl">
              <p
                className="mb-4 text-sm font-bold uppercase tracking-[0.45em]"
                style={{ color: driver.teamColour }}
              >
                DRIVER PROFILE
              </p>

              <h2 className="text-4xl font-light leading-none text-white">
                {driver.firstName}
              </h2>

              <h1 className="mt-2 text-6xl font-black uppercase leading-none text-white">
                {driver.lastName}
              </h1>

              <div className="mt-8 h-px w-32 bg-white/20" />

              <div className="mt-8 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
                    Team
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-white">
                    {driver.team}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
                    Driver Number
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-white">
                    #{driver.driverNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex justify-center items-end">
              <img
                src={`/drivers/${driver.driverNumber}.png`}
                onError={(e) => {
                  if (e.currentTarget.src !== driver.headshotUrl) {
                    e.currentTarget.src = driver.headshotUrl;
                  }
                }}
                alt={driver.fullName}
                className="w-auto h-110 object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.7)] -translate-x-25"
              />
            </div>
          </div>
          <div className="relative z-10 flex justify-center pb-8">
            <div className="flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-neutral-500">
              <span className="h-px w-10 bg-neutral-700" />
              Scroll to explore
              <span className="h-px w-10 bg-neutral-700" />
            </div>
          </div>
        </section>
        <DriverStats
        driverNumber={driver.driverNumber}
        teamColour={driver.teamColour} />
      </main>
      <Footer />
    </>
  );
}
