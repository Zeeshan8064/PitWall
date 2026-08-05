interface TimelineEntry {
  round: number;
  raceName: string;
  points: number | null;
  position: number | null;
}

interface Props {
  timeline: TimelineEntry[];
  color: string;
}

// The stored points are cumulative, which is why plotting them straight is
// dull — the line only ever climbs and every team looks alike. Two things are
// worth reading instead, and both come out of the same data:
//
//   bars  — points scored each round, so form and blank weekends show
//   line  — championship position, which actually moves in both directions
export default function SeasonChart({ timeline, color }: Props) {
  const scored = timeline.filter((entry) => entry.points !== null);

  if (scored.length < 2) {
    return (
      <p className="mt-4 text-neutral-600">
        Not enough championship data to chart this season yet.
      </p>
    );
  }

  const rounds = scored.map((entry, index) => {
    const previous = index > 0 ? scored[index - 1].points ?? 0 : 0;

    return {
      round: entry.round,
      raceName: entry.raceName,
      gained: Math.max(0, (entry.points ?? 0) - previous),
      total: entry.points ?? 0,
      position: entry.position,
    };
  });

  const width = 760;
  const height = 260;
  const padding = { top: 22, right: 44, bottom: 30, left: 40 };

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxGained = Math.max(...rounds.map((r) => r.gained), 1);

  const positions = rounds
    .map((r) => r.position)
    .filter((p): p is number => p !== null);

  // Padded by one place either side so a team that never moves off P1 still
  // has a visible line rather than one pinned to the frame.
  const bestPosition = Math.max(1, Math.min(...positions) - 1);
  const worstPosition = Math.max(...positions) + 1;
  const positionSpan = Math.max(worstPosition - bestPosition, 1);

  const slot = innerW / rounds.length;
  const barWidth = Math.max(3, Math.min(18, slot * 0.55));

  const x = (index: number) => padding.left + slot * (index + 0.5);

  const yBar = (gained: number) =>
    padding.top + innerH - (gained / maxGained) * innerH;

  // P1 at the top: lower position number sits higher.
  const yPosition = (position: number) =>
    padding.top + ((position - bestPosition) / positionSpan) * innerH;

  const positionLine = rounds
    .filter((r) => r.position !== null)
    .map((r, i, all) => {
      const index = rounds.indexOf(all[i]);
      return `${i === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${yPosition(
        r.position as number
      ).toFixed(1)}`;
    })
    .join(" ");

  const bestRound = rounds.reduce((best, r) => (r.gained > best.gained ? r : best));

  // Whole numbers only — half a championship place means nothing.
  const positionTicks: number[] = [];
  for (let p = bestPosition; p <= worstPosition; p++) {
    if (positionSpan <= 6 || (p - bestPosition) % 2 === 0) positionTicks.push(p);
  }

  const roundTickStep = Math.max(1, Math.ceil(rounds.length / 12));

  return (
    <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="barfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
            <stop offset="100%" stopColor={color} stopOpacity={0.35} />
          </linearGradient>
        </defs>

        {/* Championship position gridlines */}
        {positionTicks.map((p) => (
          <g key={`pos-${p}`}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yPosition(p)}
              y2={yPosition(p)}
              stroke="#262626"
              strokeWidth={1}
              strokeDasharray={p === 1 ? undefined : "2 4"}
            />
            <text
              x={width - padding.right + 8}
              y={yPosition(p) + 3}
              fontSize={9}
              fill="#737373"
              fontFamily="ui-monospace, monospace"
            >
              P{p}
            </text>
          </g>
        ))}

        {/* Points scored per round */}
        {rounds.map((r, index) => (
          <g key={`bar-${r.round}`}>
            <rect
              x={x(index) - barWidth / 2}
              y={yBar(r.gained)}
              width={barWidth}
              height={padding.top + innerH - yBar(r.gained)}
              rx={2}
              fill="url(#barfill)"
            />
            <title>
              {`Round ${r.round} — ${r.raceName}\n${r.gained} pts this round · ${r.total} total` +
                (r.position !== null ? ` · P${r.position}` : "")}
            </title>
          </g>
        ))}

        {/* Championship position */}
        <path
          d={positionLine}
          fill="none"
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {rounds.map((r, index) =>
          r.position === null ? null : (
            <circle
              key={`dot-${r.round}`}
              cx={x(index)}
              cy={yPosition(r.position)}
              r={2.5}
              fill="#0A0A0A"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
          )
        )}

        {/* Best scoring round */}
        <text
          x={x(rounds.indexOf(bestRound))}
          y={yBar(bestRound.gained) - 6}
          textAnchor="middle"
          fontSize={9}
          fill={color}
          fontFamily="ui-monospace, monospace"
          fontWeight="bold"
        >
          {bestRound.gained}
        </text>

        {/* Round axis */}
        {rounds.map((r, index) =>
          index % roundTickStep === 0 ? (
            <text
              key={`tick-${r.round}`}
              x={x(index)}
              y={height - 10}
              textAnchor="middle"
              fontSize={9}
              fill="#737373"
              fontFamily="ui-monospace, monospace"
            >
              {r.round}
            </text>
          ) : null
        )}

        <text
          x={padding.left - 8}
          y={padding.top + innerH / 2}
          textAnchor="middle"
          fontSize={9}
          fill="#737373"
          fontFamily="ui-monospace, monospace"
          transform={`rotate(-90 ${padding.left - 8} ${padding.top + innerH / 2})`}
        >
          PTS / ROUND
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-neutral-800 pt-3 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
          Points scored
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded bg-white" />
          Championship position
        </span>
        <span className="ml-auto normal-case tracking-normal text-neutral-600">
          Best round: {bestRound.raceName} ({bestRound.gained} pts)
        </span>
      </div>
    </div>
  );
}
