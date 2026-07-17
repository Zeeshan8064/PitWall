import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import type {
  ClassificationRow,
  Driver,
  Lap,
  Pitstop,
  RaceData,
} from "./raceTypes";

const API_BASE = "http://localhost:5000";

export function useRaceData(sessionKey: string | undefined, isFutureRace: boolean) {
  const [raceData, setRaceData] = useState<RaceData | null>(null);
  const [loading, setLoading] = useState(!isFutureRace);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionKey || isFutureRace) return;

    const fetchRaceData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(
          `${API_BASE}/api/races/${sessionKey}/race-data`
        );
        setRaceData({
          drivers: res.data?.drivers ?? [],
          laps: res.data?.laps ?? [],
          stints: res.data?.stints ?? [],
          pitstops: res.data?.pitstops ?? [],
          intervals: res.data?.intervals ?? [],
          positions: res.data?.positions ?? [],
        });
      } catch {
        setError("Failed to load race data");
      } finally {
        setLoading(false);
      }
    };

    fetchRaceData();
  }, [sessionKey, isFutureRace]);

  const driverByNumber = useMemo(() => {
    if (!raceData) return new Map<number, Driver>();
    return new Map(raceData.drivers.map((d) => [d.driverNumber, d]));
  }, [raceData]);

  const { startPositionByDriver, finishPositionByDriver } = useMemo(() => {
    const start = new Map<number, { position: number; date: string }>();
    const finish = new Map<number, { position: number; date: string }>();
    if (!raceData) return { startPositionByDriver: start, finishPositionByDriver: finish };

    for (const row of raceData.positions) {
      const s = start.get(row.driverNumber);
      if (!s || new Date(row.date) < new Date(s.date)) {
        start.set(row.driverNumber, row);
      }
      const f = finish.get(row.driverNumber);
      if (!f || new Date(row.date) > new Date(f.date)) {
        finish.set(row.driverNumber, row);
      }
    }

    return { startPositionByDriver: start, finishPositionByDriver: finish };
  }, [raceData]);

  const latestIntervalByDriver = useMemo(() => {
    const map = new Map<number, { gapToLeader: number | string | null; date: string }>();
    if (!raceData) return map;
    for (const row of raceData.intervals) {
      const existing = map.get(row.driverNumber);
      if (!existing || new Date(row.date) > new Date(existing.date)) {
        map.set(row.driverNumber, row);
      }
    }
    return map;
  }, [raceData]);

  const latestStintByDriver = useMemo(() => {
    const map = new Map<number, { stintNumber: number; compound: string }>();
    if (!raceData) return map;
    for (const stint of raceData.stints) {
      const existing = map.get(stint.driverNumber);
      if (!existing || stint.stintNumber > existing.stintNumber) {
        map.set(stint.driverNumber, stint);
      }
    }
    return map;
  }, [raceData]);

  const classification: ClassificationRow[] = useMemo(() => {
    if (!raceData) return [];

    const rows: ClassificationRow[] = raceData.drivers.map((d) => ({
      driver: driverByNumber.get(d.driverNumber),
      driverNumber: d.driverNumber,
      finishPosition: finishPositionByDriver.get(d.driverNumber)?.position ?? null,
      startPosition: startPositionByDriver.get(d.driverNumber)?.position ?? null,
      gapToLeader: latestIntervalByDriver.get(d.driverNumber)?.gapToLeader ?? null,
      currentCompound: latestStintByDriver.get(d.driverNumber)?.compound ?? null,
    }));

    const havePositions = rows.some((r) => r.finishPosition !== null);

    rows.sort((a, b) => {
      if (havePositions) {
        return (a.finishPosition ?? 999) - (b.finishPosition ?? 999);
      }
      const av = typeof a.gapToLeader === "number" ? a.gapToLeader : a.gapToLeader ? 999999 : 0;
      const bv = typeof b.gapToLeader === "number" ? b.gapToLeader : b.gapToLeader ? 999999 : 0;
      return av - bv;
    });

    return rows;
  }, [raceData, driverByNumber, finishPositionByDriver, startPositionByDriver, latestIntervalByDriver, latestStintByDriver]);

  const fastestLap = useMemo(() => {
    if (!raceData) return null;
    let best: Lap | null = null;
    for (const lap of raceData.laps) {
      if (lap.isPitOutLap || lap.lapDuration === null) continue;
      if (!best || lap.lapDuration! < best.lapDuration!) best = lap;
    }
    return best ? { lap: best, driver: driverByNumber.get(best.driverNumber) } : null;
  }, [raceData, driverByNumber]);

  const fastestSectors = useMemo(() => {
    if (!raceData) return { s1: null, s2: null, s3: null } as const;

    const pick = (key: "sector1" | "sector2" | "sector3") => {
      let best: Lap | null = null;
      for (const lap of raceData.laps) {
        const value = lap[key];
        if (value === null) continue;
        if (!best || value < (best[key] as number)) best = lap;
      }
      return best
        ? { value: best[key] as number, driver: driverByNumber.get(best.driverNumber) }
        : null;
    };

    return { s1: pick("sector1"), s2: pick("sector2"), s3: pick("sector3") };
  }, [raceData, driverByNumber]);

  const fastestPitStop = useMemo(() => {
    if (!raceData) return null;
    let best: Pitstop | null = null;
    for (const stop of raceData.pitstops) {
      if (stop.pitDuration === null) continue;
      if (!best || stop.pitDuration! < best.pitDuration!) best = stop;
    }
    return best ? { stop: best, driver: driverByNumber.get(best.driverNumber) } : null;
  }, [raceData, driverByNumber]);

  const pitLog = useMemo(() => {
    if (!raceData) return [];

    // For each pit stop, find which stint started right after it
    // so we can show the tyre the driver switched TO.
    return [...raceData.pitstops]
      .filter((p) => p.pitDuration !== null)
      .sort((a, b) => a.lapNumber - b.lapNumber)
      .map((stop) => {
        const driverStints = raceData.stints
          .filter((s) => s.driverNumber === stop.driverNumber)
          .sort((a, b) => a.stintNumber - b.stintNumber);

        // The stint that started on or just after this pit lap = new tyre
        const newStint = driverStints.find((s) => s.lapStart > stop.lapNumber);
        // The stint just before = old tyre
        const oldStint = driverStints
          .filter((s) => s.lapStart <= stop.lapNumber)
          .pop();

        return {
          stop,
          driver: driverByNumber.get(stop.driverNumber),
          fromCompound: oldStint?.compound ?? null,
          toCompound: newStint?.compound ?? null,
        };
      });
  }, [raceData, driverByNumber]);

  // Plain function — not useMemo — so it always closes over the latest
  // raceData and classification without stale-closure issues.
const buildLapSeries = (driverNumber: number) => {
  if (!raceData) return [];

  return raceData.laps
    .filter(
      (lap) =>
        lap.driverNumber === driverNumber &&
        lap.lapDuration != null &&
        Number.isFinite(lap.lapDuration)
    )
    .sort((a, b) => a.lapNumber - b.lapNumber)
    .map((lap) => ({
      lap: lap.lapNumber,
      time: lap.lapDuration!,
    }));
};

  return {
    raceData,
    loading,
    error,
    classification,
    fastestLap,
    fastestSectors,
    fastestPitStop,
    pitLog,
    buildLapSeries,
  };
}