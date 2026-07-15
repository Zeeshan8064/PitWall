import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';
const SEASONS = ['2026', '2025', '2024', '2023'];

const TYRE_MAX_LIFE: Record<string, number> = {
  SOFT: 20,
  MEDIUM: 30,
  HARD: 45,
  INTERMEDIATE: 50,
  WET: 50,
};

// ─── Interfaces ───────────────────────────────────────────

interface Race {
  sessionKey: number;
  raceName: string;
  round: number;
}

interface Driver {
  driverNumber: number;
  fullName: string;
  acronym: string;
  team: string;
  teamColour: string;
}

interface Lap {
  driverNumber: number;
  lapNumber: number;
  lapDuration: number;
  isPitOutLap: boolean;
}

interface Stint {
  driverNumber: number;
  stintNumber: number;
  lapStart: number;
  lapEnd: number;
  compound: string;
  tyreAgeAtStart: number;
}

interface PitStop {
  driverNumber: number;
  lapNumber: number;
  pitDuration: number;
}

// ─── Degradation model — linear regression ────────────────

function fitDegradation(points: { age: number; time: number }[]) {
  const n = points.length;
  if (n < 2) return { base: points[0]?.time ?? 75, rate: 0.05 };
  const sumX = points.reduce((s, p) => s + p.age, 0);
  const sumY = points.reduce((s, p) => s + p.time, 0);
  const sumXY = points.reduce((s, p) => s + p.age * p.time, 0);
  const sumXX = points.reduce((s, p) => s + p.age * p.age, 0);
  const denom = n * sumXX - sumX * sumX || 1;
  const rate = (n * sumXY - sumX * sumY) / denom;
  const base = (sumY - rate * sumX) / n;
  return { base, rate };
}

// ─── Component ────────────────────────────────────────────

function Simulator() {
  const [season, setSeason] = useState('2026');
  const [races, setRaces] = useState<Race[]>([]);
  const [sessionKey, setSessionKey] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [stints, setStints] = useState<Stint[]>([]);
  const [pitstops, setPitstops] = useState<PitStop[]>([]);
  const [driverA, setDriverA] = useState<number | null>(null);
  const [driverB, setDriverB] = useState<number | null>(null);
  const [pitLap, setPitLap] = useState(40);
  const [loadingRaces, setLoadingRaces] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [result, setResult] = useState<{
    actual: number;
    simulated: number;
    verdict: string;
    compound: string;
    maxTyreLife: number;
  } | null>(null);

  // ── Fetch races when season changes ─────────────────────
useEffect(() => {
  const fetchAll = async () => {
    setLoadingRaces(true);
    setResult(null);
    try {
      const res = await axios.get(`${API_BASE}/api/races/season/${season}`);
      const raceList = res.data.races as Race[];
      setRaces(raceList);
      const firstKey = raceList[0]?.sessionKey;
      if (!firstKey) return;
      setSessionKey(firstKey);
    } catch {
      // handle error
    } finally {
      setLoadingRaces(false);
    }
  };
  fetchAll();
}, [season]);
useEffect(() => {
  if (!sessionKey) return;
  const fetchRaceData = async () => {
    setLoadingData(true);
    setResult(null);
    try {
      const res = await axios.get(`${API_BASE}/api/races/${sessionKey}/race-data`);
      const driverList = res.data.drivers as Driver[];
      setDrivers(driverList);
      setLaps(res.data.laps as Lap[]);
      setStints(res.data.stints as Stint[]);
      setPitstops(res.data.pitstops as PitStop[]);
      if (driverList.length >= 2) {
        setDriverA(driverList[0].driverNumber);
        setDriverB(driverList[1].driverNumber);
      }
    } catch {
      // handle error
    } finally {
      setLoadingData(false);
    }
  };
  fetchRaceData();
}, [sessionKey]);

  // ── Simulation logic ────────────────────────────────────
  const runSim = () => {
    if (!driverA || !driverB) return;

    const lapsA = laps
      .filter(l => l.driverNumber === driverA && !l.isPitOutLap)
      .sort((a, b) => a.lapNumber - b.lapNumber);

    const lapsB = laps
      .filter(l => l.driverNumber === driverB && !l.isPitOutLap)
      .sort((a, b) => a.lapNumber - b.lapNumber);
    const lapNumsB = new Set(lapsB.map(l => l.lapNumber));
    const commonLapsA = lapsA.filter(l => lapNumsB.has(l.lapNumber));
    const commonLapsB = lapsB.filter(l =>
      commonLapsA.some(a => a.lapNumber === l.lapNumber)
    );

    if (commonLapsA.length === 0) return;

    const lapNums = commonLapsA.map(l => l.lapNumber);
    const seriesA = commonLapsA.map(l => l.lapDuration);
    const seriesB = commonLapsB.map(l => l.lapDuration);
    const stintsA = stints
      .filter(s => s.driverNumber === driverA)
      .sort((a, b) => a.stintNumber - b.stintNumber);

    const currentStint = stintsA.find(
      s => pitLap >= s.lapStart && pitLap <= s.lapEnd
    ) ?? stintsA[stintsA.length - 1];

    const hypotheticalCompound = currentStint?.compound ?? 'HARD';
    const maxTyreLife = TYRE_MAX_LIFE[hypotheticalCompound] ?? 40;

    const stintLaps = commonLapsA
      .filter(l =>
        currentStint
          ? l.lapNumber >= currentStint.lapStart && l.lapNumber <= currentStint.lapEnd
          : true
      )
      .map((l, i) => ({ age: i, time: l.lapDuration }));

    const { base, rate } = fitDegradation(
      stintLaps.length >= 5 ? stintLaps : commonLapsA.map((l, i) => ({ age: i, time: l.lapDuration }))
    );

    const pitsA = pitstops
      .filter(p => p.driverNumber === driverA)
      .sort((a, b) => a.lapNumber - b.lapNumber);

    const relevantPit = pitsA.find(p => p.lapNumber >= pitLap) ?? pitsA[pitsA.length - 1];
    const pitLoss = relevantPit?.pitDuration ?? 21;

    let actualGap = 0;
    for (let i = 0; i < seriesA.length; i++) {
      actualGap += seriesA[i] - seriesB[i];
    }


    let simGap = 0;
    let tyreAge = 0;
    let pitted = false;

    for (let i = 0; i < lapNums.length; i++) {
      const lapNum = lapNums[i];
      let lapTimeA: number;

      if (!pitted && lapNum >= pitLap) {
        lapTimeA = base + pitLoss;
        tyreAge = 0;
        pitted = true;
      } else if (pitted) {
        tyreAge++;
        const cliffPenalty = tyreAge > maxTyreLife
          ? (tyreAge - maxTyreLife) * 0.4
          : 0;
        lapTimeA = base + rate * tyreAge + cliffPenalty;
      } else {
        lapTimeA = seriesA[i];
      }

      simGap += lapTimeA - seriesB[i];
    }

    console.log('=== SIMULATOR DEBUG ===');
    console.log('driverA:', driverA, '| driverB:', driverB);
    console.log('compound:', hypotheticalCompound, '| maxLife:', maxTyreLife);
    console.log('base:', base.toFixed(3), '| rate:', rate.toFixed(4));
    console.log('pitLoss:', pitLoss);
    console.log('actualGap:', actualGap.toFixed(3), '| simGap:', simGap.toFixed(3));

    const verdictGap = actualGap - simGap;
    const verdict = verdictGap > 0
      ? `✅ Undercut at lap ${pitLap} would have WORKED — position improves by ${verdictGap.toFixed(2)}s`
      : `❌ Undercut at lap ${pitLap} would NOT have worked — position worsens by ${Math.abs(verdictGap).toFixed(2)}s`;

    setResult({ actual: actualGap, simulated: simGap, verdict, compound: hypotheticalCompound, maxTyreLife });
  };

  // ─── JSX ──────────────────────────────────────────────────
  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl font-bold mb-6">Undercut / Overcut Simulator</h1>

      <div className="flex flex-wrap gap-4 mb-6 items-end">

        {/* Season */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Season</label>
          <select value={season} onChange={e => setSeason(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2">
            {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Race */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Race</label>
          <select
            value={sessionKey ?? ''}
            onChange={e => setSessionKey(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 min-w-52"
            disabled={loadingRaces}
          >
            {races.map(r => (
              <option key={r.sessionKey} value={r.sessionKey}>{r.raceName}</option>
            ))}
          </select>
        </div>

        {/* Driver A */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Driver A (undercutting)</label>
          <select
            value={driverA ?? ''}
            onChange={e => setDriverA(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
            disabled={loadingData}
          >
            {drivers.map(d => (
              <option key={d.driverNumber} value={d.driverNumber}>
                {d.acronym} — {d.team}
              </option>
            ))}
          </select>
        </div>

        {/* Driver B */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Driver B (rival)</label>
          <select
            value={driverB ?? ''}
            onChange={e => setDriverB(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
            disabled={loadingData}
          >
            {drivers.map(d => (
              <option key={d.driverNumber} value={d.driverNumber}>
                {d.acronym} — {d.team}
              </option>
            ))}
          </select>
        </div>

        {/* Pit Lap */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Hypothetical pit lap</label>
          <input
            type="number"
            value={pitLap}
            onChange={e => setPitLap(parseInt(e.target.value) || 0)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 w-24"
          />
        </div>

        <button
          onClick={runSim}
          disabled={loadingData || !driverA || !driverB}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded px-4 py-2 font-semibold"
        >
          Run Simulation
        </button>
      </div>

      {(loadingRaces || loadingData) && (
        <div className="text-gray-400">Loading...</div>
      )}

      {result && (
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="text-lg font-semibold mb-4">{result.verdict}</div>
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-gray-400">Actual final gap</div>
              <div className="text-2xl">{result.actual.toFixed(2)}s</div>
            </div>
            <div>
              <div className="text-gray-400">Simulated final gap</div>
              <div className="text-2xl">{result.simulated.toFixed(2)}s</div>
            </div>
            <div>
              <div className="text-gray-400">Compound</div>
              <div className="text-2xl">{result.compound}</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-4">
            ⚠️ Cliff model applied — {result.compound} max ~{result.maxTyreLife} laps. No safety car or traffic modelled.
          </div>
        </div>
      )}
    </div>
  );
}

export default Simulator;