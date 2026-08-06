import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import TeamCard from "./TeamCard";
import { API_BASE } from "../../lib/api";

const SEASON = 2026;

interface Team {
  name: string;
  // Route identity, derived server-side from the name.
  slug: string;
  shortName: string | null;
  country: string | null;
  color: string;
}

interface ConstructorStanding {
  name: string;
  position: number;
  points: number;
  positionChange: number;
  pointsGained: number;
}

// Standings are cumulative and reported per round, so the round they were
// taken after is part of reading them correctly.
interface StandingsMeta {
  round: number | null;
  raceName: string | null;
}

interface Driver {
  driverNumber: number;
  firstName: string;
  lastName: string;
  fullName: string;
  acronym: string;
  team: string;
  teamColour: string;
}

// A team row is the join of three things that live apart in the API: the team
// itself, its championship standing, and the drivers holding its seats.
interface TeamRow extends Team {
  standing: ConstructorStanding | null;
  drivers: Driver[];
}

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [standings, setStandings] = useState<ConstructorStanding[]>([]);
  const [standingsMeta, setStandingsMeta] = useState<StandingsMeta>({
    round: null,
    raceName: null,
  });
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // Standings are the only one of the three that can legitimately be
        // empty (the championship endpoints are beta), so it must not fail
        // the page — hence allSettled rather than all.
        const [teamsRes, standingsRes, driversRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/api/races/teams?season=${SEASON}`),
          axios.get(`${API_BASE}/api/races/championship/constructors/${SEASON}`),
          axios.get(`${API_BASE}/api/races/drivers`),
        ]);

        if (teamsRes.status === "rejected") throw teamsRes.reason;

        setTeams(teamsRes.value.data.teams ?? []);

        if (standingsRes.status === "fulfilled") {
          setStandings(standingsRes.value.data.standings ?? []);
          setStandingsMeta({
            round: standingsRes.value.data.round ?? null,
            raceName: standingsRes.value.data.raceName ?? null,
          });
        } else {
          setStandings([]);
        }

        setDrivers(
          driversRes.status === "fulfilled"
            ? driversRes.value.data.drivers ?? []
            : []
        );
      } catch {
        setError("Unable to load teams.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const rows: TeamRow[] = useMemo(() => {
    const standingByName = new Map(standings.map((s) => [s.name, s]));

    const driversByTeam = new Map<string, Driver[]>();
    for (const driver of drivers) {
      const seats = driversByTeam.get(driver.team) ?? [];
      seats.push(driver);
      driversByTeam.set(driver.team, seats);
    }

    return teams
      .map((team) => ({
        ...team,
        standing: standingByName.get(team.name) ?? null,
        drivers: (driversByTeam.get(team.name) ?? []).sort(
          (a, b) => a.driverNumber - b.driverNumber
        ),
      }))
      // Championship order when standings exist, alphabetical when they don't.
      .sort((a, b) => {
        if (a.standing && b.standing) {
          return a.standing.position - b.standing.position;
        }
        if (a.standing) return -1;
        if (b.standing) return 1;

        return a.name.localeCompare(b.name);
      });
  }, [teams, standings, drivers]);

  const totalPoints = useMemo(
    () => standings.reduce((sum, s) => sum + (s.points ?? 0), 0),
    [standings]
  );

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0A0A0A] text-white pt-9">
        {/* Hero — left-aligned and instrument-panel flavoured, to sit with the
            cards rather than repeat the centred treatment used on Drivers. */}
        <section className="relative border-b border-neutral-900">
          <div className="mx-auto max-w-375 px-8 pb-10 pt-20">
            {/* Top rail: season on the left, readout on the right */}
            <div className="flex flex-wrap items-end justify-between gap-6 border-b border-neutral-900 pb-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-neutral-500">
                {SEASON}
                <span className="mx-3 text-neutral-700">/</span>
                Constructors
              </p>

              <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                <span>
                  <span className="mr-2 text-lg font-bold tabular-nums text-white">
                    {teams.length}
                  </span>
                  Teams
                </span>
                <span className="h-4 w-px bg-neutral-800" />
                <span>
                  <span className="mr-2 text-lg font-bold tabular-nums text-white">
                    {drivers.length}
                  </span>
                  Drivers
                </span>
                <span className="h-4 w-px bg-neutral-800" />
                <span>
                  <span className="mr-2 text-lg font-bold tabular-nums text-white">
                    {totalPoints}
                  </span>
                  Points
                </span>
              </div>
            </div>

            <h1 className="mt-10 font-black uppercase leading-[0.85] tracking-tight" style={{ fontSize: "clamp(2.75rem, 9vw, 8rem)" }}>
              THE GRID
              <span className="text-red-500">.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-400">
              Eleven constructors, twenty-two seats. Every point on the board is
              earned by the whole garage.
            </p>

            {/* Colour spectrum of the actual grid — a signature this page can
                have and no other can, since it is drawn from the data. */}
            <div className="mt-12 flex h-1.5 gap-1 overflow-hidden">
              {rows.map((team) => (
                <span
                  key={team.name}
                  title={team.name}
                  className="flex-1 rounded-full"
                  style={{
                    backgroundColor: team.color?.startsWith("#")
                      ? team.color
                      : `#${team.color}`,
                  }}
                />
              ))}
            </div>

            {/* Cumulative standings are meaningless without the round they
                were taken after. */}
            {standingsMeta.round !== null && (
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-600">
                Standings after Round {standingsMeta.round}
                {standingsMeta.raceName && ` · ${standingsMeta.raceName}`}
              </p>
            )}
          </div>
        </section>

        {/* Team grid */}
        <section className="mx-auto max-w-375 px-8 pb-24 pt-14">
          {loading && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900"
                />
              ))}
            </div>
          )}

          {error && <p className="text-center text-red-500">{error}</p>}

          {!loading && !error && rows.length === 0 && (
            <p className="text-center text-neutral-500">
              No teams ingested yet. Run the season ingest first.
            </p>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {rows.map((team) => (
                <TeamCard key={team.name} team={team} drivers={team.drivers} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
