import { EGG_ZONE } from "@/lib/constants";

/** Normalized arena units — ~avatar footprint for overlap checks. */
export const SWIMMER_HIT_RADIUS = 0.036;

/** Fraction of EGG_ZONE radii: inside this ellipse, swimmers get a soft push outward (outer ring still queues). */
const EGG_CORE_SCALE = 0.52;

/**
 * Soft repulsion from the dense center of the egg (same center as queue zone).
 */
export function applyEggCoreRepulsion(pos: { x: number; y: number }, strength = 0.0038): void {
  const { cx, cy, rx, ry } = EGG_ZONE;
  const rx0 = rx * EGG_CORE_SCALE;
  const ry0 = ry * EGG_CORE_SCALE;
  const dx = pos.x - cx;
  const dy = pos.y - cy;
  const nx = dx / rx0;
  const ny = dy / ry0;
  const d = Math.sqrt(nx * nx + ny * ny);
  if (d >= 1 - 1e-6 || d < 1e-9) return;
  let gx = dx / (rx0 * rx0);
  let gy = dy / (ry0 * ry0);
  const gl = Math.hypot(gx, gy);
  if (gl < 1e-9) return;
  gx /= gl;
  gy /= gl;
  const penetration = 1 - d;
  const push = penetration * strength * 7;
  pos.x += gx * push;
  pos.y += gy * push;
}

/**
 * Push `pos` away from each neighbor when closer than 2 * radius.
 */
export function applySwimmerRepulsion(
  pos: { x: number; y: number },
  others: readonly { x: number; y: number }[],
  radius = SWIMMER_HIT_RADIUS,
  factor = 0.44
): void {
  const minDist = radius * 2;
  for (const o of others) {
    const dx = pos.x - o.x;
    const dy = pos.y - o.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-9) {
      pos.x += 0.001;
      pos.y += 0.0005;
      continue;
    }
    if (dist >= minDist) continue;
    const overlap = minDist - dist;
    const nx = dx / dist;
    const ny = dy / dist;
    const push = overlap * factor;
    pos.x += nx * push;
    pos.y += ny * push;
  }
}

type XY = { x: number; y: number };

/**
 * Pairwise separation (equal mass). Mutates points in place.
 */
export function separateSwimmersPairwise(
  points: XY[],
  radius = SWIMMER_HIT_RADIUS,
  iterations = 3,
  factor = 0.38
): void {
  const minD = radius * 2;
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i];
        const b = points[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1e-9) {
          a.x -= 0.0006;
          b.x += 0.0006;
          continue;
        }
        if (dist >= minD) continue;
        const overlap = (minD - dist) * factor;
        const nx = dx / dist;
        const ny = dy / dist;
        const hx = nx * overlap * 0.5;
        const hy = ny * overlap * 0.5;
        a.x -= hx;
        a.y -= hy;
        b.x += hx;
        b.y += hy;
      }
    }
  }
}

export function clampLobbyPosition(pos: { x: number; y: number }): void {
  pos.x = Math.min(0.95, Math.max(0.05, pos.x));
  pos.y = Math.min(0.95, Math.max(0.08, pos.y));
}
