export default function Footer() {
  return (
    <footer className="border-t border-neutral-800 bg-black text-white">
      <div className="mx-auto flex h-10 max-w-7xl items-center justify-between px-8 pt-3 pb-2">

        {/* Left */}
        <div className="flex items-center gap-4">

          <span className="text-[10px] uppercase tracking-[0.3em] text-red-500">
            FINAL RADIO
          </span>

          <span className="text-neutral-600">|</span>

          <span className="text-sm text-neutral-300">
            "That's P1. Fantastic work."
          </span>

        </div>

        {/* Right */}
        <div className="flex items-center gap-6 text-sm">

          <a
            href="https://github.com/YOUR_USERNAME"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-500 transition hover:text-white"
          >
            GitHub ↗
          </a>

          <a
            href="https://linkedin.com/in/YOUR_USERNAME"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-500 transition hover:text-white"
          >
            LinkedIn ↗
          </a>

          <span className="text-neutral-700">
            © 2026 PITWALL
          </span>

        </div>

      </div>
    </footer>
  );
}