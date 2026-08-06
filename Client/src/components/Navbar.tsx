import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="fixed top-5 left-1/2 z-50 w-[94%] max-w-7xl -translate-x-1/2">
      <nav className="flex h-16 items-center justify-between rounded-2xl border border-neutral-800 bg-black/70 px-6 backdrop-blur-xl">

        {/* Logo */}
        <Link
          to="/"
          className="text-2xl font-black tracking-tight text-white"
        >
          PITWALL
        </Link>

        {/* Navigation. flex-1 + centre keeps the links balanced now that the
            right-hand button is gone; justify-between alone would push them
            against the edge. */}
        <ul className="flex flex-1 items-center justify-center gap-10 text-sm font-medium text-neutral-400">

          <li>
            <Link
              to="/race-replay"
              className="transition-colors hover:text-white"
            >
              Race Replay
            </Link>
          </li>

          <li>
            <Link
              to="/drivers"
              className="transition-colors hover:text-white"
            >
              Drivers
            </Link>
          </li>

          <li>
            <Link
              to="/teams"
              className="transition-colors hover:text-white"
            >
              Teams
            </Link>
          </li>

          <li>
            <Link
              to="/championship"
              className="transition-colors hover:text-white"
            >
              Championship
            </Link>
          </li>
                    {/* Analysis pages live behind one item — seven top-level links is
              more than the bar can carry legibly. */}
          <li className="group relative">
            <span className="cursor-default transition-colors group-hover:text-white">
              Analysis
            </span>

            <ul className="invisible absolute left-1/2 top-full z-50 w-52 -translate-x-1/2 pt-4 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
              <li className="overflow-hidden rounded-xl border border-neutral-800 bg-black/95 backdrop-blur-xl">
                {[
                  { to: "/race-strategy", label: "Race Strategy" },
                  { to: "/driver-analysis", label: "Driver Analysis" },
                  { to: "/car-performance", label: "Car Performance" },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="block border-b border-neutral-900 px-4 py-3 text-sm transition-colors last:border-0 hover:bg-neutral-900 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </li>
            </ul>
          </li>

          <li>
            <Link
              to="/simulator"
              className="transition-colors hover:text-white"
            >
              Simulator
            </Link>
          </li>

        </ul>

      </nav>
    </header>
  );
}