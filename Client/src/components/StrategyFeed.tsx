export default function StrategyFeed() {
  const items = [
    "🟢 Verstappen PIT LAP 18 → Hard",
    "🟡 Norris within DRS of Piastri",
    "🔴 Safety Car Deployed",
    "🟣 Fastest Lap: Russell 1:44.218",
    "🟢 Undercut Window Open (+18.7s)",
    "🛞 Medium Tyre Degradation: High",
    "📡 Live Telemetry Synchronized",
  ];

  return (
    <div className="fixed bottom-0 left-0 z-40 w-full overflow-hidden border-t border-neutral-800 bg-black/95 backdrop-blur-md">
      <div className="flex h-8 items-center">

        {/* Live Badge */}
        <div className="flex shrink-0 items-center gap-3 border-r border-neutral-800 px-6">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></span>

          <span className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-red-500">
            Live Strategy Feed
          </span>
        </div>

        {/* Marquee */}
        <div className="flex-1 overflow-hidden whitespace-nowrap">
          <div className="animate-marquee inline-flex gap-24 pl-8">

            {[...items, ...items].map((item, index) => (
              <span
                key={index}
                className="flex items-center gap-6 text-sm font-medium text-neutral-300"
              >
                {item}

                <span className="text-red-500">•</span>
              </span>
            ))}

          </div>
        </div>

      </div>
    </div>
  );
}