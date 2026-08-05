import { useEffect, useState } from "react";

interface DriverStatsProps {
  driverNumber: number,
  teamColour: string;
  // Supplied by DriverProfile, which already fetches it for the hero. Left
  // optional so the component still stands alone if used elsewhere.
  stats?: SeasonStats | null;
}

interface SeasonStats {
  starts: number;
  wins: number;
  podiums: number;
  averageFinish: number;
}

export default function DriverStats({
  driverNumber,
  teamColour,
  stats: providedStats,
}: DriverStatsProps) {

const [fetchedStats, setFetchedStats] = useState<SeasonStats | null>(null);

  const stats = providedStats ?? fetchedStats;

  useEffect(() => {
    // Nothing to do when the parent already has the payload.
    if (providedStats) return;

    async function loadStats() {
      try {
        const response = await fetch(
          `http://localhost:5000/api/races/drivers/${driverNumber}`
        );

        const data = await response.json();

        setFetchedStats(data.stats);
      } catch (err) {
        console.error(err);
      }
    }

    loadStats();
  }, [driverNumber, providedStats]);

  const statCards = [
    { label: "Race Starts", value: stats?.starts ?? "—" },
    { label: "Wins", value: stats?.wins ?? "—" },
    { label: "Podiums", value: stats?.podiums ?? "—" },
    {
      label: "Average Finish",
      value:
        stats?.averageFinish != null
          ? stats.averageFinish.toFixed(1)
          : "—",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-8 py-20">
      <div className="mb-12">
        <p
          className="text-xs font-bold uppercase tracking-[0.45em]"
          style={{ color: teamColour }}
        >
          Career Overview
        </p>

        <h2 className="mt-3 text-5xl font-black uppercase text-white">
          Statistics
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="overflow-hidden rounded-3xl border border-white/10 bg-[#111111]"
          >
            <div
              className="h-1 w-full"
              style={{ background: teamColour }}
            />

            <div className="p-6">
              <p className="text-4xl font-black text-white">
                {stat.value}
              </p>

              <p className="mt-3 text-xs uppercase tracking-[0.35em] text-neutral-500">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}