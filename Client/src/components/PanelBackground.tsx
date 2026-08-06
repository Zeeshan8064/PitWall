// Shared ground for the landing panels. The rest of the app reads as an
// instrument panel — hairline grids, monospace rails, telemetry traces — and
// these sections were flat black, so they felt like a different product.
//
// Everything here is decorative: pointer-events-none and aria-hidden
// throughout, so it can never intercept a click or reach a screen reader.

interface Props {
  // Accent for the glow and the trace. Defaults to the app red.
  accent?: string;
  // "trace" draws a telemetry line that animates in; "bars" a stint-style
  // ladder; "grid" is the plain blueprint ground.
  variant?: "grid" | "trace" | "bars";
  // Where the glow sits, as a percentage across the panel.
  glowX?: number;
}

// A deterministic lap-time squiggle: fast laps, a pit stop spike, then a
// recovery. Hand-shaped rather than random so it reads as plausible telemetry
// instead of noise.
const TRACE =
  "M0 120 L60 118 L120 122 L180 116 L240 124 L300 119 L360 128 L420 121 " +
  "L480 132 L540 126 L600 60 L640 58 L700 112 L760 108 L820 116 L880 110 " +
  "L940 120 L1000 114 L1060 126 L1120 118 L1180 130 L1240 122 L1300 134 L1400 128";

export default function PanelBackground({
  accent = "#e00400",
  variant = "grid",
  glowX = 70,
}: Props) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Blueprint grid */}
      <span
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 60px)," +
            "repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 60px)",
        }}
      />

      {/* Accent wash */}
      <span
        className="absolute top-1/2 h-[42rem] w-[42rem] -translate-y-1/2 rounded-full opacity-[0.13] blur-[170px]"
        style={{ background: accent, left: `${glowX}%` }}
      />

      {variant === "trace" && (
        <svg
          viewBox="0 0 1400 200"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-1/2 h-64 w-full -translate-y-1/2"
          fill="none"
        >
          <path
            d={TRACE}
            stroke={accent}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.1}
          />
          <path
            className="animate-trace"
            pathLength={1}
            d={TRACE}
            stroke={accent}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.35}
            style={{ filter: `drop-shadow(0 0 12px ${accent})` }}
          />
        </svg>
      )}

      {variant === "bars" && (
        <div className="absolute inset-x-0 bottom-0 flex h-1/2 items-end gap-1 px-10 opacity-[0.07]">
          {Array.from({ length: 48 }).map((_, i) => (
            <span
              key={i}
              className="flex-1 rounded-t"
              style={{
                // Deterministic pseudo-random heights: a fixed pattern reads
                // as data, a repeating one reads as wallpaper.
                height: `${20 + ((i * 37) % 70)}%`,
                backgroundColor: i % 5 === 0 ? accent : "#ffffff",
              }}
            />
          ))}
        </div>
      )}

      {/* Vignette, so the panel edges sink into the scroller */}
      <span
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(85% 75% at 50% 50%, transparent 0%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.85) 100%)",
        }}
      />
    </div>
  );
}
