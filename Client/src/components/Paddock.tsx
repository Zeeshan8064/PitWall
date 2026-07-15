import { Link } from "react-router-dom";

export default function Paddock() {
  const sections = [
    {
      title: "Race Strategy",
      description:
        "Understand every pit stop, undercut and overcut that shaped the race.",
      path: "/race-strategy",
    },
    {
      title: "Driver Analysis",
      description:
        "Compare pace, tyre management and consistency across every stint.",
      path: "/driver-analysis",
    },
    {
      title: "Car Performance",
      description:
        "Explore how tyre compounds, setup and strategy influence performance.",
      path: "/car-performance",
    },
    {
      title: "Strategy Simulator",
      description:
        "Run your own race strategy and see how every decision changes the result.",
      path: "strategy-simulator",
    },
  ];

  return (
    <section
      className="
    h-screen
    pt-26
    box-border
    overflow-hidden
    bg-black
  "
    >
      <div className="mx-auto w-full max-w-7xl px-8">
        {/* Heading */}

        <div className="mb-10 max-w-3xl">
          <p className="mb-2 text-sm uppercase tracking-[0.35em] text-red-500">
            FROM THE PADDOCK
          </p>

          <h2 className="text-4xl font-black leading-tight">
            Every race is won long before the chequered flag.
          </h2>

          <p className="mt-3 text-base leading-7 text-gray-400">
            Drivers cross the finish line, but victories are built through
            strategy, communication and thousands of decisions made behind the
            scenes. PitWall lets you explore that world.
          </p>
        </div>

        {/* Cards */}

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.title}
              to={section.path}
              className="group block rounded-2xl border border-neutral-800 bg-neutral-900 p-6 transition-all duration-300 hover:border-red-500 hover:-translate-y-1"
            >
              <div className="mb-4 h-px w-12 bg-red-500" />

              <h3 className="text-xl font-bold">{section.title}</h3>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                {section.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
