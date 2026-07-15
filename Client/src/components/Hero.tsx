export default function Hero() {
  return (
<section
  className="
    h-screen
    pt-27
    box-border
    overflow-hidden
    bg-[#050505]
  "
>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-16 px-8">
        {/* Left Side */}
        <div className="max-w-xl">
          <h1 className="text-7xl font-black uppercase leading-none tracking-tight">
            BOX.
            <br />
            PUSH.
            <br />
            UNDERCUT.
          </h1>

          <p className="mt-8 text-2xl text-gray-300">
            The language of the Pit Wall.
          </p>

          <p className="mt-5 leading-8 text-gray-500">
            Understand the strategy behind every radio call, every tyre change
            and every race-winning decision.
          </p>
        </div>

{/* Right Side */}
<div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-black px-6 py-5 shadow-xl">

  {/* Header */}
  <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-3">
    <h2 className="font-mono text-xs tracking-[0.3em] text-red-500">
      STRATEGY CONSOLE
    </h2>

    <span className="rounded bg-green-500/10 px-2 py-1 text-[11px] text-green-400">
      CONNECTED
    </span>
  </div>

  <div className="space-y-4 font-mono text-sm">

    {/* Session */}
    <div>
      <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">
        SESSION
      </p>

      <p className="mt-1 text-base text-white">
        Belgian Grand Prix
      </p>
    </div>

    {/* Status */}
    <div className="grid grid-cols-2">
      <div>
        <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">
          STATUS
        </p>

        <p className="mt-1 text-green-400">
          CONNECTED
        </p>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">
          LAP
        </p>

        <p className="mt-1 text-white">
          18 / 44
        </p>
      </div>
    </div>

    <hr className="border-neutral-800" />

    {/* Team Radio */}
    <div>
      <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">
        TEAM RADIO
      </p>

      <p className="mt-2 text-gray-400">
        Engineer
      </p>

      <p className="mt-1 text-lg font-bold text-red-400">
        "BOX. BOX."
      </p>
    </div>

    <hr className="border-neutral-800" />

    {/* Tyres + Position */}
    <div className="grid grid-cols-2 gap-8">

      <div>
        <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">
          TYRES
        </p>

        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs text-yellow-400">
            MED
          </span>

          <span className="text-gray-500">→</span>

          <span className="rounded-full bg-gray-300/20 px-3 py-1 text-xs text-gray-200">
            HARD
          </span>
        </div>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">
          POSITION
        </p>

        <div className="mt-2 flex items-center gap-2 font-bold">
          <span className="text-red-400">P2</span>
          <span className="text-gray-500">→</span>
          <span className="text-green-400">P1</span>
        </div>
      </div>

    </div>

    <hr className="border-neutral-800" />

    {/* Result */}
    <div>
      <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">
        RESULT
      </p>

      <div className="mt-2 inline-block rounded border border-red-500/30 bg-red-500/10 px-3 py-2 font-bold text-red-400">
        UNDERCUT SUCCESSFUL
      </div>
    </div>

  </div>
</div>
      </div>
    </section>
  );
}