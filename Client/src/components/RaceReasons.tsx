import PanelBackground from "./PanelBackground";

// Each claim gets a small visual made of the same thing the app actually
// plots, so the section demonstrates rather than asserts.
function DegCurve() {
  return (
    <svg viewBox="0 0 200 60" className="h-14 w-full" fill="none">
      <line x1="0" y1="55" x2="200" y2="55" stroke="#262626" strokeWidth="1" />
      {[
        { d: "M0 46 C60 44 130 34 200 12", colour: "#ef4444" },
        { d: "M0 48 C60 47 130 42 200 28", colour: "#eab308" },
        { d: "M0 50 C60 49 130 46 200 38", colour: "#e5e5e5" },
      ].map((line) => (
        <path
          key={line.colour}
          d={line.d}
          stroke={line.colour}
          strokeWidth="2"
          strokeLinecap="round"
          opacity={0.85}
        />
      ))}
    </svg>
  );
}

function StintBars() {
  return (
    <div className="flex h-14 flex-col justify-center gap-1.5">
      {[
        [
          { w: 44, c: "#eab308" },
          { w: 56, c: "#e5e5e5" },
        ],
        [
          { w: 26, c: "#eab308" },
          { w: 38, c: "#e5e5e5" },
          { w: 36, c: "#e5e5e5" },
        ],
        [
          { w: 30, c: "#ef4444" },
          { w: 70, c: "#eab308" },
        ],
      ].map((row, i) => (
        <div key={i} className="flex h-3 overflow-hidden rounded-sm">
          {row.map((seg, j) => (
            <span
              key={j}
              className="border-r border-black/60 last:border-0"
              style={{ width: `${seg.w}%`, backgroundColor: seg.c, opacity: 0.85 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function GapTrace() {
  return (
    <svg viewBox="0 0 200 60" className="h-14 w-full" fill="none">
      <line x1="0" y1="30" x2="200" y2="30" stroke="#525252" strokeWidth="1" />
      <path
        d="M0 30 L30 27 L60 31 L90 20 L110 44 L140 38 L170 22 L200 8"
        stroke="#e00400"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="110" cy="44" r="3" fill="#0A0A0A" stroke="#e00400" strokeWidth="1.5" />
    </svg>
  );
}

const REASONS = [
  {
    number: "01",
    title: "Every overtake has a reason.",
    body: "Tyre age, degradation and dirty air create the opportunity long before the move happens. The pass is the last thing to occur, not the first.",
    visual: <DegCurve />,
    caption: "Compound degradation",
  },
  {
    number: "02",
    title: "Every pit stop has a purpose.",
    body: "A stop is traffic management, an undercut, a hedge against a safety car. Twenty seconds spent to gain more than twenty back.",
    visual: <StintBars />,
    caption: "Stint strategies",
  },
  {
    number: "03",
    title: "Every victory starts earlier.",
    body: "The flag confirms a result decided dozens of laps before it. The winning call is usually invisible at the moment it is made.",
    visual: <GapTrace />,
    caption: "Cumulative gap",
  },
];

export default function RaceReasons() {
  return (
    <section className="relative box-border flex h-screen items-center overflow-hidden bg-[#050505] pb-16 pt-28">
      <PanelBackground variant="bars" glowX={30} />

      <div className="relative mx-auto max-w-6xl px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {REASONS.map((reason) => (
            <article
              key={reason.number}
              className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/70 p-6 backdrop-blur-sm"
            >
              <span className="absolute left-0 top-0 h-full w-[3px] bg-red-600" />

              <div className="flex items-baseline justify-between pl-2">
                <span className="text-4xl font-black leading-none text-red-500">
                  {reason.number}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-neutral-600">
                  {reason.caption}
                </span>
              </div>

              <div className="mt-5 pl-2">{reason.visual}</div>

              <h3 className="mt-5 pl-2 text-xl font-bold leading-tight">
                {reason.title}
              </h3>

              <p className="mt-3 pl-2 text-sm leading-7 text-neutral-400">
                {reason.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
