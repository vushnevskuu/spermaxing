import { EGG_ZONE } from "@/lib/constants";

export function isInEggZone(nx: number, ny: number): boolean {
  const { cx, cy, rx, ry } = EGG_ZONE;
  const dx = (nx - cx) / rx;
  const dy = (ny - cy) / ry;
  return dx * dx + dy * dy <= 1;
}
