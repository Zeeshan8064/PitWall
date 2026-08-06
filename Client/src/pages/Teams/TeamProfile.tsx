import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import SeasonChart from "./SeasonChart";

const API_BASE = "http://localhost:5000";
const SEASON = 2026;

interface TeamInfo {
  fullName: string | null;
  base: string | null;
  entered: number | null;
  enteredAs: string | null;
  owner: string | null;
  principal: string | null;
  powerUnit: string | null;
  titleSponsor: string | null;
  constructorsTitles: number | null;
  lineage: string[];
  blurb: string | null;
}

interface TeamDetail {
  team: {
    name: string;
    slug: string;
    shortName: string | null;
    country: string | null;
    color: string;
  };
  // Hand-seeded background; null when a team has not been seeded.
  info: TeamInfo | null;
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
  // Seeded server-side by scripts/seedTeams.ts; null for an unseeded team.
  const info = detail?.info ?? null;

  // Only rounds the team actually has standings for — a season part-run
  // should not render across rounds that have not happened. Scaling now lives
  // in SeasonChart; this is just the emptiness test.
  const scored = detail?.timeline.filter((entry) => entry.points !== null) ?? [];

  // Grouped by the question each answers rather than eight identical tiles
  // that give a retirement count the same weight as the championship position.
  const panels = detail
    ? [
        {
          label: "Championship",
          headline: detail.championship.position
            ? `P${detail.championship.position}`
            : "—",
          headlineLabel: "Position",
          rows: [
            { label: "Points", value: detail.championship.points },
            {
              label: "After Round",
              value: detail.championship.round ?? "—",
            },
          ],
        },
        {
          label: "Results",
          headline: detail.stats.wins,
          headlineLabel: detail.stats.wins === 1 ? "Win" : "Wins",
          rows: [
            { label: "Podiums", value: detail.stats.podiums },
            { label: "Poles", value: detail.stats.poles },
            {
              label: "Best Finish",
              value: detail.stats.bestFinish
                ? `P${detail.stats.bestFinish}`
                : "—",
            },
          ],
        },
        {
          label: "Reliability",
          // Entries, not races: two cars start every round.
          headline: detail.stats.entries,
          headlineLabel: "Car Entries",
          rows: [
            { label: "Retirements", value: detail.stats.dnfs },
            {
              label: "Finish Rate",
              value: detail.stats.entries
                ? `${Math.round(
                    ((detail.stats.entries - detail.stats.dnfs) /
                      detail.stats.entries) *
                      100
                  )}%`
                : "—",
            },
          ],
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

            {/* About — hand-maintained background, since OpenF1 has no team
                endpoint. Absent for a team with no entry rather than rendering
                a block of dashes. */}
            {info && (
              <section className="mt-12">
                <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-neutral-500">
                  About
                </h2>

                <div className="mt-4 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
                  <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                    <span
                      className="absolute left-0 top-0 h-full w-[3px]"
                      style={{ backgroundColor: color }}
                    />

                    <p className="pl-2 text-lg font-semibold leading-relaxed text-neutral-200">
                      {info.blurb}
                    </p>

                    <p className="mt-5 pl-2 font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500">
                      {info.fullName}
                    </p>

                    {info.lineage && info.lineage.length > 0 && (
                      <div className="mt-6 border-t border-neutral-900 pl-2 pt-5">
                        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-600">
                          Previously
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
                          {info.lineage.map((name) => (
                            <span
                              key={name}
                              className="rounded-lg border border-neutral-800 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-400"
                            >
                              {name}
                            </span>
                          ))}
                          <span className="font-mono text-[10px] text-neutral-700">
                            →
                          </span>
                          <span
                            className="rounded-lg border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white"
                            style={{ borderColor: color, backgroundColor: `${color}1a` }}
                          >
                            {detail.team.name}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                    <dl className="space-y-3.5">
                      {[
                        {
                          label: "Entered F1",
                          // Every field is nullable now that it comes from a
                          // seed that may not cover a given team.
                          value: info.entered
                            ? info.enteredAs
                              ? `${info.entered} · as ${info.enteredAs}`
                              : String(info.entered)
                            : "—",
                        },
                        { label: "Base", value: info.base ?? "—" },
                        { label: "Owner", value: info.owner ?? "—" },
                        { label: "Team Principal", value: info.principal ?? "—" },
                        { label: "Power Unit", value: info.powerUnit ?? "—" },
                        ...(info.titleSponsor
                          ? [{ label: "Title Sponsor", value: info.titleSponsor }]
                          : []),
                        {
                          label: "Constructors' Titles",
                          value:
                            info.constructorsTitles !== null
                              ? String(info.constructorsTitles)
                              : "—",
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex items-baseline justify-between gap-4 border-b border-neutral-900 pb-3 last:border-0 last:pb-0"
                        >
                          <dt className="shrink-0 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">
                            {row.label}
                          </dt>
                          <dd className="text-right text-sm font-semibold text-neutral-200">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </section>
            )}

            {/* Line-up */}
            <section className="mt-12">
              <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-neutral-500">
                Line-up
              </h2>

              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                {detail.drivers.length === 0 && (
                  <p className="text-neutral-600">No drivers on record.</p>
                )}

                {detail.drivers.map((driver) => (
                  <Link
                    key={driver.driverNumber}
                    to={`/drivers/${driver.driverNumber}`}
                    className="group relative h-44 overflow-hidden rounded-2xl border border-neutral-800 transition-colors duration-300 hover:border-neutral-600"
                    style={{
                      background: `linear-gradient(105deg, #0A0A0A 0%, #0E0E0E 45%, ${shade(
                        color,
                        0.5
                      )} 140%)`,
                    }}
                  >
                    {/* Number as a livery decal behind the render */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 select-none font-black italic leading-none text-transparent"
                      style={{
                        fontSize: "7rem",
                        WebkitTextStroke: `2px ${color}`,
                        opacity: 0.35,
                      }}
                    >
                      {driver.driverNumber}
                    </span>

                    <div className="relative z-10 flex h-full flex-col justify-between p-5">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/50">
                          {driver.acronym}
                        </p>

                        <p className="mt-3 text-lg font-light leading-none text-white/80">
                          {driver.firstName}
                        </p>
                        <p className="mt-1 text-3xl font-black uppercase leading-none text-white">
                          {driver.lastName}
                        </p>
                      </div>

                      <p
                        className="font-mono text-2xl font-black tabular-nums"
                        style={{ color }}
                      >
                        {driver.driverNumber}
                      </p>
                    </div>

                    {/* Render, bottom-anchored so the crop never lands on a face */}
                    <img
                      src={`/drivers/${driver.driverNumber}.png`}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      className="pointer-events-none absolute bottom-0 right-2 z-10 h-[112%] w-auto object-contain object-bottom drop-shadow-[0_15px_35px_rgba(0,0,0,0.8)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-105"
                    />
                  </Link>
                ))}
              </div>
            </section>

            {/* Season stats */}
            <section className="mt-12">
              <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-neutral-500">
                Season
              </h2>

              <div className="mt-4 grid gap-5 lg:grid-cols-3">
                {panels.map((panel) => (
                  <div
                    key={panel.label}
                    className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-6"
                  >
                    <span
                      className="absolute left-0 top-0 h-full w-[3px]"
                      style={{ backgroundColor: color }}
                    />

                    <p className="pl-2 font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                      {panel.label}
                    </p>

                    <div className="mt-5 flex items-baseline gap-3 pl-2">
                      <span className="text-5xl font-black leading-none tabular-nums text-white">
                        {panel.headline}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
                        {panel.headlineLabel}
                      </span>
                    </div>

                    <dl className="mt-6 space-y-2.5 border-t border-neutral-900 pl-2 pt-4">
                      {panel.rows.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-baseline justify-between gap-4"
                        >
                          <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">
                            {row.label}
                          </dt>
                          <dd className="font-mono text-sm font-bold tabular-nums text-neutral-200">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
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
