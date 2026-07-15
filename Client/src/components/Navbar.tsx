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

        {/* Navigation */}
        <ul className="flex items-center gap-10 text-sm font-medium text-neutral-400">

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
              to="/simulator"
              className="transition-colors hover:text-white"
            >
              Simulator
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
              to="/championship"
              className="transition-colors hover:text-white"
            >
              Championship
            </Link>
          </li>

        </ul>

        {/* Sign In */}
        <button className="rounded-xl border border-red-600 px-5 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-red-600">
          Sign In
        </button>

      </nav>
    </header>
  );
}