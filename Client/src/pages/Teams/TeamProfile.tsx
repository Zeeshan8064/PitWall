import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import SeasonChart from "./SeasonChart";

const API_BASE = "http://localhost:5000";
const SEASON = 2026;

interface TeamDetail {
  team: {
    name: string;
    slug: string;
    shortName: string | null;
    country: string | null;
    color: string;
  };
  season: number;
  drivers: {
    driverNumber: number;
    firstName: string;
    lastName: string;
    fullName: string;
    acronym: string;
    countryCode: string | null;
  }[];
  championship: {
    points: number;
    position: number | null;
    round: number | null;
  };
  stats: {
    entries: number;
    wins: number;
    podiums: number;
    poles: number;
    dnfs: number;
    bestFinish: number | null;
    racePoints: number;
  };
  timeline: {
    round: number;
    raceName: string;
    points: number | null;
    position: number | null;
  }[];
}

function withHash(color: string) {
  if (!color) return "#666666";

  return color.startsWith("#") ? color : `#${color}`;
}

// Darkened team colour for the hero's radial ground. Keeping the wash well
// below the wordmark's own colour is what lets the name stay readable on it.
function shade(hex: string, amount: number) {
  const clean = withHash(hex).slice(1);

  if (clean.length !== 6) return withHash(hex);

  const channels = [0, 2, 4].map((i) => {
    const value = parseInt(clean.slice(i, i + 2), 16);

    return Math.max(0, Math.min(255, Math.round(value * amount)));
  });

  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export default function TeamProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Artwork is optional — a team without a car render or logo still gets a
  // complete hero, it just loses the image.
  const [carFailed, setCarFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await axios.get(
          `${API_BASE}/api/races/teams/${slug}?season=${SEASON}`
        );

        if (!cancelled) setDetail(res.data);
      } catch (err) {
        if (cancelled) return;

        const status = axios.isAxiosError(err) ? err.response?.status : null;

        setError(status === 404 ? "No such team." : "Unable to load team.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const color = withHash(detail?.team.color ?? "");

  // Only rounds the team actually has standings for — a season part-run
  // should not render across rounds that have not happened. Scaling now lives
  // in SeasonChart; this is just the emptiness test.
  const scored = detail?.timeline.filter((entry) => entry.points !== null) ?? [];

  const statCards = detail
    ? [
        { label: "Championship", value: detail.championship.position ? `P${detail.championship.position}` : "—" },
        { label: "Points", value: detail.championship.points },
        { label: "Wins", value: detail.stats.wins },
        { label: "Podiums", value: detail.stats.podiums },
        { label: "Poles", value: detail.stats.poles },
        { label: "Car Entries", value: detail.stats.entries },
        { label: "Retirements", value: detail.stats.dnfs },
        {
          label: "Best Finish",
          value: detail.stats.bestFinish ? `P${detail.stats.bestFinish}` : "—",
        },
      ]
    : [];

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0A0A0A] px-8 pb-24 pt-28 text-white">
        <Link
          to="/teams"
          className="mb-6 flex w-fit items-center gap-1 text-sm text-neutral-400 transition-colors hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Teams
        </Link>

        {loading && (
          <div className="h-56 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900" />
        )}

        {error && <p className="mt-10 text-red-400">{error}</p>}

        {!loading && !error && detail && (
          <>
            {/* Hero — wordmark as the backdrop, car in front of it, marks and
                vertical type framing the edges. */}
            <section
              className="relative overflow-hidden rounded-3xl"
              style={{
                background: `radial-gradient(120% 90% at 70% 40%, ${shade(
                  color,
                  0.55
                )} 0%, #0A0A0A 62%)`,
              }}
            >
              {/* Team name, sized to the viewport so long names still fit on
                  one line rather than wrapping behind the car. */}
              {/* Sized against the name's length, not a fixed vw: at a flat
                  24vw a long name overflows and clips, and a short one is
                  undersized. Dividing by character count also lands every
                  team's wordmark at roughly the same width, which reads as
                  deliberate across the set.

                  Car and wordmark share a centre line so the render crosses
                  the letterforms. A side-profile car has a tall bounding box
                  but a thin silhouette, so the name still reads through the
                  gaps between the wheels and under the nose — that
                  interlocking is the effect, not an accident of sizing. */}
              <h1
                aria-label={detail.team.name}
                // Inset to clear the vertical rails on both edges — at
                // inset-x-0 the last letter collides with the season rail.
                className="pointer-events-none absolute inset-x-14 top-[24%] -translate-y-1/2 select-none whitespace-nowrap text-center font-black uppercase leading-none tracking-tighter sm:inset-x-20"
                style={{
                  // Coefficient allows for that inset, so the longest names
                  // still clear the rails rather than just the container.
                  fontSize: `min(13rem, ${(116 / Math.max(detail.team.name.length, 6)).toFixed(2)}vw)`,
                  color,
                }}
              >
                {detail.team.name}
              </h1>

              {/* Vertical rail, left */}
              <div className="absolute left-0 top-0 flex h-full items-center pl-5 sm:pl-7">
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/50"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  Formula 1 Team
                  {detail.team.country ? ` · ${detail.team.country}` : ""}
                </span>
              </div>

              {/* Stacked marks, right. Logo pinned to the top like the
                  reference; the rail spans only the artwork, not the footer,
                  so nothing can drift out of it. */}
              <div className="absolute right-0 top-0 flex flex-col items-center gap-4 pr-5 pt-6 sm:pr-7">
                {!logoFailed && (
                  <img
                    src={`/teams/logos/${detail.team.slug}.webp`}
                    alt=""
                    onError={() => setLogoFailed(true)}
                    className="h-10 w-10 object-contain sm:h-12 sm:w-12"
                  />
                )}

                <span className="h-10 w-px bg-white/20" />

                <span
                  className="font-mono text-[10px] uppercase tracking-[0.45em] text-white/60"
                  style={{ writingMode: "vertical-rl" }}
                >
                  {detail.season} Season
                </span>
              </div>

              {/* Car, in front of the wordmark. Held to a share of the hero
                  height so the letters clear it above and below — a full-height
                  render is what buried the name. */}
              <div className="relative flex h-[270px] items-center justify-center px-14 sm:h-[380px] sm:px-20">
                {!carFailed && (
                  <img
                    src={`/teams/cars/${detail.team.slug}.avif`}
                    alt={`${detail.team.name} car`}
                    onError={() => setCarFailed(true)}
                    // Dropped below centre while the wordmark rises above it,
                    // so the car crosses the lower half of the letters and
                    // their tops stay clear.
                    className="max-h-[62%] w-auto max-w-full translate-y-[32%] object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.85)]"
                  />
                )}
              </div>

              {/* Footer rail */}
              <div className="relative flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-6 py-4 sm:px-10">
                <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/60">
                  {detail.drivers.map((d) => d.lastName).join(" · ") || "—"}
                </span>

                <span className="flex items-baseline gap-4">
                  {detail.championship.round !== null && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">
                      {detail.championship.points} pts · after Round{" "}
                      {detail.championship.round}
                    </span>
                  )}

                  {detail.championship.position !== null && (
                    <span
                      className="font-mono text-xl font-black tabular-nums"
                      style={{ color }}
                    >
                      P{detail.championship.position}
                    </span>
                  )}
                </span>
              </div>
            </section>

            {/* Line-up */}
            <section className="mt-10">
              <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-neutral-500">
                Line-up
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {detail.drivers.length === 0 && (
                  <p className="text-neutral-600">No drivers on record.</p>
                )}

                {detail.drivers.map((driver) => (
                  <Link
                    key={driver.driverNumber}
                    to={`/drivers/${driver.driverNumber}`}
                    className="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition-colors hover:border-neutral-600"
                  >
                    <img
                      src={`/drivers/${driver.driverNumber}.png`}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      // The renders are portraits, so plain object-cover crops
                      // to the middle of the body and cuts the head off.
                      // Anchoring to the top keeps the face and trims the legs.
                      className="h-16 w-16 shrink-0 rounded-xl bg-neutral-950 object-cover object-top"
                    />

                    <div>
                      <p className="text-xl font-bold">
                        {driver.firstName}{" "}
                        <span className="font-black uppercase">
                          {driver.lastName}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        #{driver.driverNumber} · {driver.acronym}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Season stats */}
            <section className="mt-12">
              <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-neutral-500">
                Season
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                {statCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
                  >
                    <p className="text-3xl font-black">{card.value}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-neutral-500">
                      {card.label}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Points progression */}
            <section className="mt-12">
              <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-neutral-500">
                Season Form
              </h2>

              {scored.length === 0 ? (
                <p className="mt-4 text-neutral-600">
                  No championship data ingested for this season.
                </p>
              ) : (
                <SeasonChart timeline={detail.timeline} color={color} />
              )}
            </section>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
