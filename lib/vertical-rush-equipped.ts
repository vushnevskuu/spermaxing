/**
 * Состояние «надетых» пикапов на аватаре в vertical rush.
 * Не путать с отрисовкой предмета на треке — см. `lib/vertical-rush-render.ts` (`drawPickupOrObstacle`).
 */
import type { BadId, GoodId } from "@/lib/vertical-rush-catalog";

export type RushPickupId = GoodId | BadId;

export type RushEquippedFlags = Record<RushPickupId, boolean>;

export function createEmptyRushEquipped(): RushEquippedFlags {
  return {
    zinc: false,
    omega: false,
    garlic: false,
    onion_ring: false,
    citrus: false,
    chips: false,
    candy: false,
    soda: false,
    fried_ring: false,
    sugar_cube: false,
  };
}
