export default function RaceReasons() {
  return (
    <section
  className="
    h-screen
    pt-60
    box-border
    overflow-hidden
    bg-[#050505]
  "
>
      <div className="mx-auto max-w-6xl px-8">

        <div className="grid gap-12 md:grid-cols-3">

          <div>
            <span className="text-red-500 text-5xl font-black">01</span>

            <h3 className="mt-6 text-2xl font-bold">
              Every overtake has a reason.
            </h3>

            <p className="mt-5 leading-8 text-neutral-400">
              Tyre degradation, battery deployment, DRS, dirty air and race pace
              all combine to create opportunities that television never fully
              explains.
            </p>
          </div>

          <div>
            <span className="text-red-500 text-5xl font-black">02</span>

            <h3 className="mt-6 text-2xl font-bold">
              Every pit stop has a purpose.
            </h3>

            <p className="mt-5 leading-8 text-neutral-400">
              A pit stop isn't just fresh tyres. It's traffic management,
              undercuts, overcuts and calculated risks made in seconds.
            </p>
          </div>

          <div>
            <span className="text-red-500 text-5xl font-black">03</span>

            <h3 className="mt-6 text-2xl font-bold">
              Every victory starts earlier.
            </h3>

            <p className="mt-5 leading-8 text-neutral-400">
              The chequered flag confirms the result. The winning decision is
              often made dozens of laps before the finish.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}