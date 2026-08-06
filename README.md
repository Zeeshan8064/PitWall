# PitWall

Formula 1 strategy analysis. Three seasons of timing data rebuilt from the
[OpenF1](https://openf1.org) API, with a tyre degradation model fitted from
each circuit's own laps.

**Live:** https://pitwall-taupe-omega.vercel.app

---

## What it does

Most F1 sites show you results. PitWall tries to show you *why* the result
happened — the tyre that was eleven laps fresher, the stop made on lap 24, the
compound that gave up half a second a lap.

| | |
|---|---|
| **Race Replay** | Every session of a weekend — race, qualifying, sprint, sprint qualifying — with lap charts, pit logs and classification |
| **Strategy Simulator** | Build a tyre strategy against a model fitted from that circuit's real laps, and see where it would have finished |
| **Race Strategy** | Every driver's stints, when they stopped, and how fast each compound degraded |
| **Driver Analysis** | Two drivers head to head, defaulting to team-mates — same car, so what's left is the driver |
| **Car Performance** | Sector-by-sector deficits against the quickest car through each sector |
| **Drivers / Teams / Championship** | Season stats, standings, and per-round form |

---

## The interesting part: modelling tyre degradation

The simulator needed a degradation figure per compound per circuit. The obvious
approach — regress lap time against tyre age — **doesn't work**:

```
compound   n     deg s/lap   R²
MEDIUM     471   0.014       0.02
HARD       625   0.013       0.02
SOFT        43  -0.025       0.01     ← softs getting faster with age
```

R² of 0.02, and soft tyres apparently improving as they wear. The cause is
**fuel burn**: a car gets roughly 0.05 s/lap quicker as it empties, which is
almost exactly the rate its tyres go off. Pooled together, the two cancel.

Regressing on tyre age **and** lap number separates them:

```
                deg s/lap   fuel s/lap   R²
Hungaroring  S    0.132       -0.078     0.40
             M    0.048       -0.052     0.48
             H    0.041       -0.044     0.31

Bahrain      S    0.126       -0.073     0.45
             M    0.126       -0.077     0.56
             H    0.096       -0.051     0.26

Monza        M    0.031       -0.067     0.33
             H    0.021       -0.061     0.55
```

Three things suggest this is real rather than curve-fitted noise:

- **Compound ordering is correct at every circuit** — soft degrades fastest,
  hard slowest.
- **The fuel coefficient is consistently −0.05 to −0.08 s/lap**, which is the
  right physical magnitude and was never specified anywhere.
- **Circuit character emerges** — Bahrain is 3–4× harder on tyres than Monza,
  which is exactly its reputation.

Pit loss is derived the same way: the excess time on a driver's in-lap and
out-lap over their own median lap, which captures the pit lane rather than just
the stationary time. Hungaroring comes out at 20.8s across 29 real stops.

### Does it work?

Given only their tyre strategies, the model was asked to time the 2025
Hungarian Grand Prix:

```
Norris  (won)  M×31 / H×39          1:34:44.5
Piastri (P2)   M×18 / H×27 / H×25   1:34:46.3
```

It independently ranks the actual winner ahead of the actual second-place
finisher, by 1.8 seconds, having never been told who won.

### Where it fails

Predicted finishing position is reliable at the front and **unreliable down the
order** — 32% within two places at Hungary. The model gives every driver their
median green-flag pace, so a driver who spent the race in traffic is credited
with the clean pace they showed in their few free laps.

Rather than hide that, the simulator shows a **drift column**: how far the
model moves each driver from where they actually finished. A large drift marks
where traffic, a safety car or an incident decided the race instead of pace.
The weakness becomes the interesting readout.

---

## Circuit outlines from telemetry

The circuit shapes aren't traced artwork or third-party map data. Each one is
derived from OpenF1's `/location` feed: take the fastest clean lap of a race,
pull the car's x/y position samples for exactly that lap window, simplify with
Douglas–Peucker, and normalise into a 100×100 SVG path.

The result is ~660 bytes per circuit, and the derived Hungaroring lap measures
**4278 m against the real 4381 m** — 2.4% out, which is about right for a
racing line sampled at 3.7 Hz.

24 of 26 circuits are traced. The two exceptions are venues that hadn't been
raced yet at the time of writing, and fall back to a decorative shape.

---

## Stack

**Client** — React, TypeScript, Vite, Tailwind, React Router. Charts are
hand-written SVG rather than a charting library, so the axes could be clipped
to sensible domains (a single safety car lap otherwise flattens a whole race).

**Server** — Express, TypeScript, Mongoose, MongoDB Atlas.

**Data** — OpenF1, ingested once into MongoDB rather than proxied per request.

---

## Ingest

The pipeline is rate-limit aware by necessity: OpenF1 allows ~30 requests a
minute, and a full three-season ingest is around 1,100 requests.

- Requests are **paced evenly** rather than bursting to the cap. Firing the
  minute's budget in ten seconds and idling for fifty gets the same throughput
  and trips the server-side limiter far more often.
- 429s back off exponentially with jitter; 5xx responses retry separately.
- **404 means empty, not fatal** — OpenF1 returns 404 for `/intervals` on every
  qualifying session, which would otherwise abort them.
- Endpoints are requested **per session type**, measured rather than assumed —
  qualifying has no meaningful intervals or pit stops, so they aren't fetched.
- Runs are **resumable**: sessions that already hold results are skipped, so an
  interrupted ingest can be restarted without re-fetching.

```bash
cd Server
npm run ingest -- 2026     # ingest a season
npm run outlines -- 2026   # trace circuit outlines
npm run seed:teams         # team metadata (no API source exists)
npm run verify             # integrity report
npm run rebuild            # wipe and rebuild from scratch
```

`npm run verify` checks for duplicate rounds, orphaned documents, cancelled
sessions, missing outlines and index drift, and can repair most of them.

---

## Running locally

Requires Node 18+ and a MongoDB connection string.

```bash
# API
cd Server
cp .env.example .env        # set MONGODB_URI
npm install
npm run dev                 # http://localhost:5000

# Client
cd Client
cp .env.example .env        # VITE_API_BASE defaults to localhost:5000
npm install
npm run dev                 # http://localhost:5173
```

The database needs populating before the UI shows anything — see **Ingest**
above. A full 2024–2026 rebuild takes about 50 minutes, almost all of it
waiting on rate limits.

---

## Known limitations

- **The simulator models green-flag running only.** No safety cars, traffic or
  weather. `/race_control` isn't ingested, so real safety car windows aren't
  available.
- **Car Performance is proxied.** Sector times and speed traps stand in for
  cornering and straightline pace; throttle, braking and DRS need `/car_data`,
  which samples at 3.7 Hz per car and would need lap-grain aggregation rather
  than raw storage.
- **Rate limiting is in-memory per process**, so it doesn't meaningfully
  throttle on serverless hosting.
- **Team metadata is hand-maintained.** OpenF1 has no team endpoint — teams are
  reconstructed from the drivers entered in a session, which carry only a name
  and a colour. Owner, principal, power unit and title sponsor need reviewing
  each season.
- **No tests.** The tyre model and simulation maths are pure functions and the
  obvious place to start.

---

## Data and attribution

Timing data from [OpenF1](https://openf1.org). Team logos, car renders and
driver images are the property of their respective teams and Formula One
Group, used here in a non-commercial personal project.

Not affiliated with Formula 1.
