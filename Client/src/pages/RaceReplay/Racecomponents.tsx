import type { ClassificationRow, Driver, Pitstop } from "./raceTypes";
import {
  formatLapTime,
  formatSectorTime,
  formatPitDuration,
  formatPosition,
  formatOrdinal,
  formatGap,
  COMPOUND_STYLES,
} from "./F1utils"

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
  // Qualifying has a pole-sitter rather than a winner, and no grid to have
  // started from. Defaults keep every existing race call site unchanged.
  leaderLabel?: string;
  showStartPosition?: boolean;
  showPitStop?: boolean;
}

export function RaceStats({
  winner,
  fastestLap,
  fastestPitStop,
  fastestSectors,
  leaderLabel = "Winner",
  showStartPosition = true,
  showPitStop = true,
}: RaceStatsProps) {
  return (
    <section className="mt-10 grid gap-4 md:grid-cols-4">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <p className="text-xs uppercase tracking-widest text-neutral-500">{leaderLabel}</p>
        <p className="mt-3 text-xl font-bold">{winner?.driver?.fullName ?? "—"}</p>
        {showStartPosition && (
          <p className="mt-1 text-sm text-neutral-500">
            Started {formatPosition(winner?.startPosition ?? null)}
          </p>
        )}
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

      {showPitStop && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-xs uppercase tracking-widest text-neutral-500">Fastest Pit Stop</p>
          <p className="mt-3 text-xl font-bold text-red-400">
            {formatPitDuration(fastestPitStop?.stop.pitDuration ?? null)}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {fastestPitStop?.driver?.acronym ?? "—"} · Lap {fastestPitStop?.stop.lapNumber ?? "—"}
          </p>
        </div>
      )}

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
  // Laps on which the active driver pitted. Optional so the chart still works
  // for sessions with no stops.
  pitLaps?: number[];
}

export function LapTimeChartSection({
  classification,
  activeDriverNumber,
  onSelectDriver,
  buildLapSeries,
  pitLaps = [],
}: LapTimeChartSectionProps) {
  const activeRow = classification.find((r) => r.driverNumber === activeDriverNumber);
  const points = activeDriverNumber !== null ? buildLapSeries(activeDriverNumber) : [];

  const color = activeRow?.driver?.teamColour
    ? `#${activeRow.driver.teamColour}`
    : "#e00400";

  const hasData = Boolean(activeRow?.driver) && points.length > 1;

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
            const rowColor = row.driver.teamColour ? `#${row.driver.teamColour}` : "#888";
            return (
              <button
                key={row.driverNumber}
                onClick={() => onSelectDriver(row.driverNumber)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                  isSelected
                    ? "border-transparent text-white"
                    : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300"
                }`}
                style={isSelected ? { backgroundColor: rowColor + "33", borderColor: rowColor } : {}}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: rowColor }} />
                {row.driver.acronym}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        {hasData ? (
          <LapTimeChart
            points={points}
            color={color}
            acronym={activeRow!.driver!.acronym}
            pitLaps={pitLaps}
          />
        ) : (
          <p className="py-8 text-center text-sm text-neutral-500">
            No lap data available for this driver.
          </p>
        )}
      </div>
    </section>
  );
}

// Value below which `fraction` of the sorted sample sits.
function quantile(sorted: number[], fraction: number) {
  if (sorted.length === 0) return 0;

  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((sorted.length - 1) * fraction))
  );

  return sorted[index];
}

function LapTimeChart({
  points,
  color,
  acronym,
  pitLaps,
}: {
  points: { lap: number; time: number }[];
  color: string;
  acronym: string;
  pitLaps: number[];
}) {
  const width = 720;
  const height = 280;
  const padding = { top: 18, right: 18, bottom: 34, left: 56 };

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const laps = points.map((p) => p.lap);
  const lapMin = Math.min(...laps);
  const lapMax = Math.max(...laps);

  const sorted = [...points.map((p) => p.time)].sort((a, b) => a - b);
  const fastest = sorted[0];

  // Safety car and in-laps are many seconds off the pace. Scaling to the true
  // maximum flattens the racing laps into a straight line and hides the
  // degradation trend, which is the whole point of the chart — so the domain
  // stops at the 92nd percentile and slower laps are clamped to the floor and
  // flagged instead of being drawn to scale.
  const domainMax = Math.max(quantile(sorted, 0.92), fastest + 0.4);
  const domainMin = fastest;
  const span = Math.max(domainMax - domainMin, 0.5);

  const x = (lap: number) =>
    padding.left + ((lap - lapMin) / Math.max(lapMax - lapMin, 1)) * innerW;

  // Faster laps sit higher: better is up.
  const y = (time: number) =>
    padding.top + ((Math.min(Math.max(time, domainMin), domainMax) - domainMin) / span) * innerH;

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.lap).toFixed(1)} ${y(p.time).toFixed(1)}`)
    .join(" ");

  const area =
    `${line} L ${x(lapMax).toFixed(1)} ${padding.top + innerH} ` +
    `L ${x(lapMin).toFixed(1)} ${padding.top + innerH} Z`;

  const fastestPoint = points.find((p) => p.time === fastest);
  const pitSet = new Set(pitLaps);
  const gradientId = `lapfill-${acronym}`;

  // Roughly every 5 laps, without crowding short sessions.
  const tickStep = Math.max(1, Math.ceil((lapMax - lapMin) / 8 / 5) * 5);
  const ticks: number[] = [];
  for (let lap = lapMin; lap <= lapMax; lap += tickStep) ticks.push(lap);

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Horizontal grid, labelled with lap times */}
        {Array.from({ length: 5 }).map((_, i) => {
          const t = domainMin + (i / 4) * span;
          const gy = y(t);

          return (
            <g key={i}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={gy}
                y2={gy}
                stroke="#262626"
                strokeWidth={1}
              />
              <text
                x={padding.left - 10}
                y={gy + 3}
                textAnchor="end"
                fontSize={10}
                fill="#737373"
                fontFamily="ui-monospace, monospace"
              >
                {formatLapTime(t)}
              </text>
            </g>
          );
        })}

        {/* Pit stops, as full-height markers behind the trace */}
        {pitLaps.map((lap) => (
          <g key={`pit-${lap}`}>
            <line
              x1={x(lap)}
              x2={x(lap)}
              y1={padding.top}
              y2={padding.top + innerH}
              stroke="#525252"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={x(lap)}
              y={padding.top - 6}
              textAnchor="middle"
              fontSize={8}
              fill="#a3a3a3"
              fontFamily="ui-monospace, monospace"
            >
              PIT
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradientId})`} stroke="none" />

        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* One dot per lap. The native title gives a readable tooltip without
            wiring up pointer tracking. */}
        {points.map((p) => {
          const clamped = p.time > domainMax;

          return (
            <circle
              key={p.lap}
              cx={x(p.lap)}
              cy={y(p.time)}
              r={clamped ? 2.5 : 2}
              fill={clamped ? "#0A0A0A" : color}
              stroke={clamped ? "#737373" : "none"}
              strokeWidth={1}
            >
              <title>
                {`Lap ${p.lap} — ${formatLapTime(p.time)}` +
                  (pitSet.has(p.lap) ? " (pit)" : "") +
                  (clamped ? " — off scale" : "")}
              </title>
            </circle>
          );
        })}

        {/* Fastest lap */}
        {fastestPoint && (
          <g>
            <circle
              cx={x(fastestPoint.lap)}
              cy={y(fastestPoint.time)}
              r={4.5}
              fill="none"
              stroke="#c026d3"
              strokeWidth={2}
            />
            <text
              x={x(fastestPoint.lap)}
              y={y(fastestPoint.time) - 10}
              textAnchor="middle"
              fontSize={9}
              fill="#e879f9"
              fontFamily="ui-monospace, monospace"
            >
              {formatLapTime(fastestPoint.time)}
            </text>
          </g>
        )}

        {/* Lap axis */}
        {ticks.map((lap) => (
          <text
            key={`tick-${lap}`}
            x={x(lap)}
            y={height - 10}
            textAnchor="middle"
            fontSize={10}
            fill="#737373"
            fontFamily="ui-monospace, monospace"
          >
            {lap}
          </text>
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-neutral-800 pt-3 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded" style={{ backgroundColor: color }} />
          {acronym}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-fuchsia-600" />
          Fastest {formatLapTime(fastest)}
        </span>
        {pitLaps.length > 0 && (
          <span className="flex items-center gap-2">
            <span className="h-3 w-px border-l border-dashed border-neutral-500" />
            Pit stop
          </span>
        )}
        <span className="ml-auto normal-case tracking-normal text-neutral-600">
          Slow laps clamped to the axis floor
        </span>
      </div>
    </div>
  );
}

// ─── Pit Stop Log ───────────────────────────────────────────────────────────

interface PitLogProps {
  pitLog: {
    stop: Pitstop;
    driver: Driver | undefined;
    // Built by useRaceData and previously ignored here — the tyre change is
    // the most interesting thing about a stop.
    fromCompound?: string | null;
    toCompound?: string | null;
  }[];
}

function CompoundPill({ compound }: { compound: string | null | undefined }) {
  if (!compound) {
    return <span className="font-mono text-[10px] text-neutral-700">—</span>;
  }

  return (
    <span
      className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
        COMPOUND_STYLES[compound] ?? "border-neutral-700 text-neutral-400"
      }`}
    >
      {compound.slice(0, 1)}
    </span>
  );
}

export function PitStopLog({ pitLog }: PitLogProps) {
  if (pitLog.length === 0) return null;

  const durations = pitLog
    .map((e) => e.stop.pitDuration)
    .filter((d): d is number => d !== null);

  const fastestDuration = Math.min(...durations);
  const slowestDuration = Math.max(...durations);
  const spread = Math.max(slowestDuration - fastestDuration, 0.001);

  return (
    <section className="mt-16">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-500">
          Pit Stop Log
        </p>

        <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          {pitLog.length} stops · fastest{" "}
          <span className="text-white">{fastestDuration.toFixed(3)}s</span> ·
          slowest {slowestDuration.toFixed(3)}s
        </p>
      </div>

      {/* Two columns halve the scroll length, and each row is a bar rather
          than a card so relative stop times are comparable at a glance. */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-px md:grid-cols-2">
        {pitLog.map((entry, i) => {
          const duration = entry.stop.pitDuration;
          const isFastest = duration === fastestDuration;
          const color = entry.driver?.teamColour
            ? `#${entry.driver.teamColour}`
            : "#555";

          // Relative within the session, floored so the quickest stop is still
          // a visible bar rather than nothing.
          const fill =
            duration === null
              ? 0
              : 0.12 + ((duration - fastestDuration) / spread) * 0.88;

          return (
            <div
              key={i}
              className="group relative flex items-center gap-3 border-b border-neutral-900 py-2"
            >
              <span className="w-12 shrink-0 font-mono text-[11px] tabular-nums text-neutral-600">
                L{entry.stop.lapNumber}
              </span>

              <span
                className="h-4 w-0.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />

              <span className="w-12 shrink-0 font-mono text-xs font-bold text-white">
                {entry.driver?.acronym ?? `#${entry.stop.driverNumber}`}
              </span>

              <span className="flex shrink-0 items-center gap-1">
                <CompoundPill compound={entry.fromCompound} />
                <span className="font-mono text-[10px] text-neutral-700">→</span>
                <CompoundPill compound={entry.toCompound} />
              </span>

              {/* Duration bar */}
              <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-900">
                <span
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${fill * 100}%`,
                    backgroundColor: isFastest ? "#c026d3" : color,
                    opacity: isFastest ? 1 : 0.65,
                  }}
                />
              </span>

              <span
                className={`w-16 shrink-0 text-right font-mono text-xs tabular-nums ${
                  isFastest ? "font-bold text-fuchsia-400" : "text-neutral-300"
                }`}
              >
                {duration !== null ? `${duration.toFixed(3)}s` : "—"}
              </span>
            </div>
          );
        })}
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