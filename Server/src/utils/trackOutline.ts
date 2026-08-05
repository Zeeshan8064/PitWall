import { OpenF1Lap, OpenF1Location } from "../types";

// Circuit outlines are traced from a single flying lap of car position
// telemetry. Only the finished path is kept — the raw /location samples are
// several thousand rows per lap and have no use once the path exists.

export interface OutlinePoint {
  x: number;
  y: number;
}

// Simplification tolerance in OpenF1 position units (decimetres). 40 keeps
// every corner while cutting a ~300 point lap to ~60.
const SIMPLIFY_TOLERANCE = 40;

// Below this the trace is too sparse to be a circuit — usually a truncated
// sample window rather than a real lap.
const MIN_POINTS = 20;

// The end of a lap should return to its start. Anything further apart than
// this share of the bounding box means the window caught part of a lap, or an
// in-lap that peeled off into the pits.
const MAX_CLOSURE_GAP = 0.2;

// Douglas-Peucker. Iterative rather than recursive: a lap can carry a few
// thousand samples and deep recursion would risk the stack.
function simplify(points: OutlinePoint[], tolerance: number): OutlinePoint[] {
  if (points.length < 3) return points;

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [first, last] = stack.pop()!;

    let maxDistance = 0;
    let index = 0;

    const start = points[first];
    const end = points[last];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;

    for (let i = first + 1; i < last; i++) {
      const distance = Math.abs(
        ((points[i].x - start.x) * dy - (points[i].y - start.y) * dx) / length
      );

      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }

    if (maxDistance > tolerance && index > first) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

// Chooses the lap to trace: the quickest lap that is a genuine flying lap.
//
// Taking the fastest also filters out safety car laps and in-laps for free —
// neither is ever the quickest lap of a session — without needing race control
// data, which is not ingested.
export function pickOutlineLap(laps: OpenF1Lap[]): OpenF1Lap | null {
  const candidates = laps.filter(
    (lap) =>
      lap.lap_duration !== null &&
      lap.lap_duration > 0 &&
      lap.date_start !== null &&
      !lap.is_pit_out_lap
  );

  if (candidates.length === 0) return null;

  return candidates.reduce((best, lap) =>
    (lap.lap_duration ?? Infinity) < (best.lap_duration ?? Infinity) ? lap : best
  );
}

// Normalises a lap's samples into an SVG path inside a 100x100 box, aspect
// ratio preserved and y flipped for SVG's downward axis.
//
// Returns null rather than a bad path when the samples do not describe a
// closed lap — an absent outline falls back to the decorative shape, which is
// better than rendering a broken one.
export function buildOutlinePath(samples: OpenF1Location[]): string | null {
  const points: OutlinePoint[] = samples
    .filter(
      (sample) =>
        sample.x !== null &&
        sample.y !== null &&
        !(sample.x === 0 && sample.y === 0)
    )
    .map((sample) => ({ x: sample.x as number, y: sample.y as number }));

  if (points.length < MIN_POINTS) return null;

  const simplified = simplify(points, SIMPLIFY_TOLERANCE);

  if (simplified.length < MIN_POINTS) return null;

  const xs = simplified.map((point) => point.x);
  const ys = simplified.map((point) => point.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX;
  const height = maxY - minY;
  const extent = Math.max(width, height);

  if (extent <= 0) return null;

  const first = simplified[0];
  const last = simplified[simplified.length - 1];

  if (Math.hypot(last.x - first.x, last.y - first.y) / extent > MAX_CLOSURE_GAP) {
    return null;
  }

  // 96 of the 100 units, leaving a hairline margin so a stroked path is not
  // clipped at the viewBox edge.
  const scale = 96 / extent;
  const offsetX = (100 - width * scale) / 2;
  const offsetY = (100 - height * scale) / 2;

  const path = simplified
    .map((point, index) => {
      const x = (offsetX + (point.x - minX) * scale).toFixed(1);
      const y = (offsetY + (maxY - point.y) * scale).toFixed(1);

      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");

  return `${path} Z`;
}
