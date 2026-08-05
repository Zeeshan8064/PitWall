import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DriverStats from "./DriverStats";
import DriverHero from "./DriverHero";
import type { TimelineEntry } from "./DriverHero";
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

interface DriverSeason {
  season: number | null;
  stats: {
    wins: number;
    podiums: number;
    poles: number;
    starts: number;
    averageFinish: number;
  } | null;
  championship: { position: number | null; points: number } | null;
  timeline: TimelineEntry[];
}

// Mirrors the server's toSlug so team artwork resolves from a team name.
// Kept deliberately simple; the API is the source of truth for real slugs.
function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function DriverProfile() {
  const { driverNumber } = useParams();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [season, setSeason] = useState<DriverSeason | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Both in flight together: the grid identifies the driver, the season
        // endpoint carries stats, standings and the round-by-round timeline.
        // Fetching here rather than inside DriverStats means the hero and the
        // stats section share one request instead of making two.
        const [gridRes, seasonRes] = await Promise.all([
          fetch("http://localhost:5000/api/races/drivers"),
          fetch(`http://localhost:5000/api/races/drivers/${driverNumber}`),
        ]);

        const grid = await gridRes.json();

        setDriver(
          grid.drivers.find(
            (d: Driver) => d.driverNumber === Number(driverNumber)
          ) ?? null
        );

        if (seasonRes.ok) {
          const data = await seasonRes.json();

          setSeason({
            season: data.season ?? null,
            stats: data.stats ?? null,
            championship: data.championship ?? null,
            timeline: data.timeline ?? [],
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [driverNumber]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white">
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
        <main className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white">
          Driver not found.
        </main>
        <Footer />
      </>
    );
  }

  const teamSlug = driver.team ? toSlug(driver.team) : null;

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0A0A0A] pt-9 text-white">
        <DriverHero
          driver={driver}
          season={season?.season ?? null}
          championship={season?.championship ?? null}
          stats={season?.stats ?? null}
          timeline={season?.timeline ?? []}
          teamSlug={teamSlug}
        />

        <DriverStats
          driverNumber={driver.driverNumber}
          teamColour={driver.teamColour}
          stats={season?.stats ?? null}
        />
      </main>

      <Footer />
    </>
  );
}
