import { Link } from "react-router-dom";
import PanelBackground from "./PanelBackground";

// Each card carries a small mark built from what that page actually plots, so
// the grid reads as four different tools rather than four identical boxes.
const MARKS: Record<string, React.ReactNode> = {
  "Race Strategy": (
    <div className="flex h-8 flex-col justify-center gap-1">
      {[
        [
          { w: 42, c: "#eab308" },
          { w: 58, c: "#e5e5e5" },
        ],
        [
          { w: 28, c: "#ef4444" },
          { w: 34, c: "#eab308" },
          { w: 38, c: "#e5e5e5" },
        ],
      ].map((row, i) => (
        <div key={i} className="flex h-2.5 overflow-hidden rounded-sm">
          {row.map((seg, j) => (
            <span
              key={j}
              className="border-r border-black/60 last:border-0"
              style={{ width: `${seg.w}%`, backgroundColor: seg.c, opacity: 0.8 }}
            />
          ))}
        </div>
      ))}
    </div>
  ),

  "Driver Analysis": (
    <svg viewBox="0 0 120 32" className="h-8 w-28" fill="none">
      <line x1="0" y1="16" x2="120" y2="16" stroke="#404040" strokeWidth="1" />
      <path
        d="M0 16 L20 13 L40 18 L60 9 L80 21 L100 12 L120 5"
        stroke="#e00400"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),

  "Car Performance": (
    <div className="flex h-8 items-end gap-1.5">
      {[70, 45, 90, 60].map((h, i) => (
        <span
          key={i}
          className="w-4 rounded-sm bg-neutral-500"
          style={{ height: `${h}%`, opacity: 0.85 }}
        />
      ))}
    </div>
  ),

  "Strategy Simulator": (
    <svg viewBox="0 0 120 32" className="h-8 w-28" fill="none">
      <path
        d="M0 26 C30 24 50 18 70 12 L120 4"
        stroke="#e00400"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M0 26 C30 25 50 22 70 20 L120 16"
        stroke="#525252"
        strokeWidth="2"
        strokeDasharray="3 3"
        strokeLinecap="round"
      />
    </svg>
  ),
};

const SECTIONS = [
  {
    title: "Race Strategy",
    description:
      "Every tyre every driver ran, when they stopped, and how fast each compound gave up its pace.",
    path: "/race-strategy",
  },
  {
    title: "Driver Analysis",
    description:
      "Two drivers, one race, lap by lap. Defaults to team-mates — same car, so what is left is the driver.",
    path: "/driver-analysis",
  },
  {
    title: "Car Performance",
    description:
      "Where each car finds and loses lap time, sector by sector, against the quickest through each one.",
    path: "/car-performance",
  },
  {
    title: "Strategy Simulator",
    description:
      "Build a strategy against degradation fitted from that circuit's real laps, and see where it finishes.",
    path: "/strategy-simulator",
  },
];

export default function Paddock() {
  return (
    <section className="relative box-border flex h-screen items-center overflow-hidden bg-black pb-16 pt-28">
      <PanelBackground variant="grid" glowX={50} />

      <div className="relative mx-auto w-full max-w-7xl px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-red-500">
          From the Paddock
        </p>

        <h2 className="mt-4 max-w-3xl text-3xl font-black uppercase leading-[0.95] tracking-tight md:text-4xl">
          Every race is won long before the chequered flag
          <span className="text-red-500">.</span>
        </h2>

        {/* Four across on desktop rather than 2x2: the taller grid pushed this
            panel past the space between the fixed navbar and the feed, so
            centring it overflowed at both ends. */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SECTIONS.map((section) => (
            <Link
              key={section.title}
              to={section.path}
              className="group relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/80 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-red-500"
            >
              <span className="absolute left-0 top-0 h-full w-[3px] bg-red-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="opacity-70 transition-opacity duration-300 group-hover:opacity-100">
                {MARKS[section.title]}
              </div>

              <h3 className="mt-4 text-lg font-bold">{section.title}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                {section.description}
              </p>

              <div className="mt-4 flex items-center gap-2 border-t border-neutral-900 pt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600 transition-colors duration-300 group-hover:text-white">
                Open
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
