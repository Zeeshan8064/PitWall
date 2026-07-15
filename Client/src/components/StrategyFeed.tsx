export default function StrategyFeed() {
  const items = [
    "🎙️ Team Radio Archive Updated",
    "🛞 Tyre Strategy Simulator Available",
    "📊 Belgian GP Replay Available",
    "🏎️ Driver Comparison Added",
    "📡 Live Telemetry Online",
  ];

  return (
    <div className="fixed bottom-0 left-0 z-40 w-full border-t border-neutral-800 bg-black/95 backdrop-blur-md">
      <div className="flex h-4 items-center overflow-hidden">

        <div className="shrink-0 border-r border-neutral-800 px-6">
          <span className="font-mono text-xs uppercase tracking-[0.35em] text-red-500">
            ● LIVE STRATEGY FEED
          </span>
        </div>

        <div className="overflow-hidden whitespace-nowrap">
          <div className="animate-marquee inline-flex gap-16 pl-8">

            {[...items, ...items].map((item, index) => (
              <span
                key={index}
                className="text-lg text-neutral-300"
              >
                {item}
              </span>
            ))}

          </div>
        </div>

      </div>
    </div>
  );
}