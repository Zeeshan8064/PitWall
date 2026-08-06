import PanelBackground from "./PanelBackground";

// What television shows you, against what actually decided the race. The
// contrast is the argument for the whole product, so it is made structurally
// rather than as three lines of centred prose.
const CONTRAST = [
  {
    seen: "A pass into turn one",
    truth: "A tyre eleven laps fresher, and a pit call made on lap 24",
  },
  {
    seen: "A driver dropping back",
    truth: "Two seconds a lap of degradation on a compound that was over",
  },
  {
    seen: "A win by four seconds",
    truth: "An undercut that gained six, and a safety car that nearly took it",
  },
];

export default function WhyPitwall() {
  return (
    // Content is centred between the fixed navbar and the fixed strategy feed
    // rather than flowed from the top, so a short viewport cannot push it
    // underneath either of them.
    <section className="relative box-border flex h-screen items-center overflow-hidden bg-[#050505] pb-16 pt-28">
      <PanelBackground variant="trace" glowX={62} />

      <div className="relative mx-auto max-w-6xl px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-red-500">
          Why PitWall
        </p>

        <h2 className="mt-6 max-w-4xl text-5xl font-black uppercase leading-[0.9] tracking-tight md:text-7xl">
          The race is only
          <br />
          half the story
          <span className="text-red-500">.</span>
        </h2>

        {/* Two columns per row: what you saw, what it actually was. */}
        <div className="mt-14 max-w-4xl border-t border-neutral-900">
          {CONTRAST.map((row) => (
            <div
              key={row.seen}
              className="grid gap-3 border-b border-neutral-900 py-5 md:grid-cols-[1fr_2fr] md:gap-10"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-600">
                {row.seen}
              </p>

              <p className="text-lg leading-8 text-neutral-300">{row.truth}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.3em] text-neutral-600">
          <span className="text-neutral-400">On the left</span>, the broadcast
          <span className="mx-3 text-neutral-800">/</span>
          <span className="text-neutral-400">on the right</span>, the data
        </p>
      </div>
    </section>
  );
}
