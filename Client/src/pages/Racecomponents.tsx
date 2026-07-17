import type { ClassificationRow, Driver, Pitstop } from "./raceTypes";
import {
  formatLapTime,
  formatSectorTime,
  formatPitDuration,
  formatPosition,
  formatOrdinal,
  formatGap,
  COMPOUND_STYLES,
} from "./F1utils";

// ─── Stat Cards ────────────────────────────────────────────────────────────

interface RaceStatsProps {
  winner: ClassificationRow | undefined;
  fastestLap: { lap: { lapDuration: number | null; lapNumber: number }; driver: Driver | undefined } | null;
  fastestPitStop: { stop: Pitstop; driver: Driver | undefined } | null;
  fastestSectors: {
    s1: { value: number; driver: Driver | undefined } | null;
    s2: { value: number; driver: Driver | undefined } | null;
    s3: { value: number; driver: Driver | undefined } | null;
  };
}

export function RaceStats({ winner, fastestLap, fastestPitStop, fastestSectors }: RaceStatsProps) {
  return (
    <section className="mt-10 grid gap-4 md:grid-cols-4">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <p className="text-xs uppercase tracking-widest text-neutral-500">Winner</p>
        <p className="mt-3 text-xl font-bold">{winner?.driver?.fullName ?? "—"}</p>
        <p className="mt-1 text-sm text-neutral-500">
          Started {formatPosition(winner?.startPosition ?? null)}
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <p className="text-xs uppercase tracking-widest text-neutral-500">Fastest Lap</p>
        <p className="mt-3 text-xl font-bold text-red-400">
          {formatLapTime(fastestLap?.lap.lapDuration ?? null)}
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          {fastestLap?.driver?.acronym ?? "—"} · Lap {fastestLap?.lap.lapNumber ?? "—"}
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <p className="text-xs uppercase tracking-widest text-neutral-500">Fastest Pit Stop</p>
        <p className="mt-3 text-xl font-bold text-red-400">
          {formatPitDuration(fastestPitStop?.stop.pitDuration ?? null)}
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          {fastestPitStop?.driver?.acronym ?? "—"} · Lap {fastestPitStop?.stop.lapNumber ?? "—"}
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <p className="mb-2 text-xs uppercase tracking-widest text-neutral-500">Fastest Sectors</p>
        <div className="space-y-1 text-sm">
          {(["s1", "s2", "s3"] as const).map((s, i) => (
            <div key={s} className="flex items-center justify-between">
              <span className="text-neutral-500">S{i + 1}</span>
              <span className="font-semibold text-white">
                {formatSectorTime(fastestSectors[s]?.value ?? null)}
                <span className="ml-1 text-neutral-500">
                  {fastestSectors[s]?.driver?.acronym ?? ""}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Driver Toggle + Chart ──────────────────────────────────────────────────

interface LapTimeChartSectionProps {
  classification: ClassificationRow[];
  activeDriverNumber: number | null;
  onSelectDriver: (n: number) => void;
  buildLapSeries: (n: number) => { lap: number; time: number }[];
}

export function LapTimeChartSection({
  classification,
  activeDriverNumber,
  onSelectDriver,
  buildLapSeries,
}: LapTimeChartSectionProps) {
  const activeRow = classification.find((r) => r.driverNumber === activeDriverNumber);
  const points = activeDriverNumber !== null ? buildLapSeries(activeDriverNumber) : [];

  const series =
    activeRow?.driver && points.length > 1
      ? [
          {
            driverNumber: activeRow.driverNumber,
            acronym: activeRow.driver.acronym,
            color: activeRow.driver.teamColour ? `#${activeRow.driver.teamColour}` : "#e00400",
            points,
          },
        ]
      : [];

  return (
    <section className="mt-14">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-500">
          Lap Time Progression
        </p>

        <div className="flex flex-wrap gap-2">
          {classification.map((row) => {
            if (!row.driver) return null;
            const isSelected = activeDriverNumber === row.driverNumber;
            const color = row.driver.teamColour ? `#${row.driver.teamColour}` : "#888";
            return (
              <button
                key={row.driverNumber}
                onClick={() => onSelectDriver(row.driverNumber)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                  isSelected
                    ? "border-transparent text-white"
                    : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300"
                }`}
                style={isSelected ? { backgroundColor: color + "33", borderColor: color } : {}}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                {row.driver.acronym}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        {series.length > 0 ? (
          <LapTimeChart series={series} />
        ) : (
          <p className="py-8 text-center text-sm text-neutral-500">
            No lap data available for this driver.
          </p>
        )}
      </div>
    </section>
  );
}

function LapTimeChart({
  series,
}: {
  series: { driverNumber: number; acronym: string; color: string; points: { lap: number; time: number }[] }[];
}) {
  const width = 640;
  const height = 260;
  const padding = { top: 16, right: 16, bottom: 28, left: 48 };

  const allPoints = series.flatMap((s) => s.points);
  const lapMin = Math.min(...allPoints.map((p) => p.lap));
  const lapMax = Math.max(...allPoints.map((p) => p.lap));
  const timeMin = Math.min(...allPoints.map((p) => p.time));
  const timeMax = Math.max(...allPoints.map((p) => p.time));

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const x = (lap: number) =>
    padding.left + ((lap - lapMin) / Math.max(lapMax - lapMin, 1)) * innerW;

  // SVG y=0 is top. We want FAST (low time) at TOP and SLOW (high time)
  // at BOTTOM — so we invert: smaller time → larger y coordinate.
  const y = (time: number) =>
    padding.top + ((timeMax - time) / Math.max(timeMax - timeMin, 1)) * innerH;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {Array.from({ length: 5 }).map((_, i) => {
          // i=0 → fastest (top of chart), i=4 → slowest (bottom)
          const t = timeMax - (i / 4) * (timeMax - timeMin);
          const gy = y(t);
          return (
            <g key={i}>
              <line x1={padding.left} x2={width - padding.right} y1={gy} y2={gy} stroke="#262626" strokeWidth={1} />
              <text x={padding.left - 8} y={gy + 3} textAnchor="end" fontSize={10} fill="#737373">
                {formatLapTime(t)}
              </text>
            </g>
          );
        })}

        {series.map((s) => {
          const d = s.points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.lap)} ${y(p.time)}`)
            .join(" ");
          return (
            <path
              key={s.driverNumber}
              d={d}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.9}
            />
          );
        })}

        <text x={padding.left} y={height - 6} fontSize={10} fill="#737373">Lap {lapMin}</text>
        <text x={width - padding.right} y={height - 6} textAnchor="end" fontSize={10} fill="#737373">Lap {lapMax}</text>
      </svg>

      <div className="mt-4 flex flex-wrap gap-4">
        {series.map((s) => (
          <div key={s.driverNumber} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-xs font-semibold text-neutral-400">{s.acronym}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pit Stop Log ───────────────────────────────────────────────────────────

interface PitLogProps {
  pitLog: { stop: Pitstop; driver: Driver | undefined }[];
}

export function PitStopLog({ pitLog }: PitLogProps) {
  if (pitLog.length === 0) return null;

  const fastestDuration = Math.min(
    ...pitLog
      .map((e) => e.stop.pitDuration)
      .filter((d): d is number => d !== null)
  );

  return (
    <section className="mt-16">
      <p className="mb-6 text-xs font-bold uppercase tracking-[0.35em] text-red-500">
        Pit Stop Log
      </p>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical spine */}
        <div className="absolute left-22 top-0 h-full w-px bg-neutral-800" />

        <div className="space-y-0">
          {pitLog.map((entry, i) => {
            const isFastest = entry.stop.pitDuration === fastestDuration;
            const color = entry.driver?.teamColour
              ? `#${entry.driver.teamColour}`
              : "#555";

            return (
              <div key={i} className="relative flex items-center gap-6 py-3">
                {/* Lap label */}
                <div className="w-18 shrink-0 text-right">
                  <span className="text-xs font-bold text-neutral-500">
                    LAP {entry.stop.lapNumber}
                  </span>
                </div>

                {/* Dot on the spine */}
                <div
                  className="relative z-10 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-[#0A0A0A]"
                  style={{ backgroundColor: color }}
                />

                {/* Card */}
                <div
                  className={`flex flex-1 items-center justify-between rounded-xl border p-3 transition-colors ${
                    isFastest
                      ? "border-red-500/40 bg-red-500/5"
                      : "border-neutral-800 bg-neutral-900/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-8 w-1 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {entry.driver?.acronym ?? `#${entry.stop.driverNumber}`}
                        <span className="ml-2 text-xs font-normal text-neutral-500">
                          {entry.driver?.team}
                        </span>
                      </p>
                      {isFastest && (
                        <p className="text-[11px] font-bold uppercase tracking-wider text-red-500">
                          ⚡ Fastest Stop
                        </p>
                      )}
                    </div>
                  </div>

                  <p
                    className={`text-base font-black tabular-nums ${
                      isFastest ? "text-red-400" : "text-white"
                    }`}
                  >
                    {entry.stop.pitDuration !== null
                      ? `${entry.stop.pitDuration.toFixed(3)}s`
                      : "—"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Classification Table ───────────────────────────────────────────────────

interface ClassificationTableProps {
  classification: ClassificationRow[];
}

export function ClassificationTable({ classification }: ClassificationTableProps) {
  return (
    <section className="mt-16">
      <p className="mb-6 text-xs font-bold uppercase tracking-[0.35em] text-red-500">
        Classification
      </p>

      <div className="overflow-hidden rounded-2xl border border-neutral-800">
        <table className="w-full">
          <thead className="bg-neutral-900">
            <tr>
              {["Pos", "Driver", "Grid", "Gap", "Tyre"].map((h) => (
                <th key={h} className="px-6 py-4 text-left text-xs uppercase tracking-widest text-neutral-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classification.map((row, index) => (
              <tr key={row.driverNumber} className="border-t border-neutral-800">
                <td className="px-6 py-4 font-bold text-neutral-400">
                  {row.finishPosition ?? index + 1}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-6 w-1 rounded-full"
                      style={{
                        backgroundColor: row.driver?.teamColour
                          ? `#${row.driver.teamColour}`
                          : "#555",
                      }}
                    />
                    <div>
                      <p className="font-medium text-white">
                        {row.driver?.fullName ?? `#${row.driverNumber}`}
                      </p>
                      <p className="text-xs text-neutral-500">{row.driver?.team}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-neutral-400">
                  {formatOrdinal(row.startPosition)}
                </td>
                <td className="px-6 py-4 text-neutral-400">
                  {index === 0 ? "Leader" : formatGap(row.gapToLeader)}
                </td>
                <td className="px-6 py-4">
                  {row.currentCompound ? (
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                        COMPOUND_STYLES[row.currentCompound] ?? "border-neutral-700 text-neutral-400"
                      }`}
                    >
                      {row.currentCompound}
                    </span>
                  ) : (
                    <span className="text-neutral-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {classification.length === 0 && (
          <div className="p-8 text-center text-neutral-500">
            No driver data available for this session.
          </div>
        )}
      </div>
    </section>
  );
}