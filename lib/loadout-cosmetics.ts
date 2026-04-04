import type { FaceExtraId, HeadgearId, NeckWearId } from "@/types";

export const HEADGEAR_IDS = [
  "none",
  "halo_ring",
  "bobble_antennae",
  "tiny_crown",
  "sport_visor",
  "striped_headband",
  "party_cone",
  "orbit_dots",
  "foam_horns",
  "ufo_dish",
] as const satisfies readonly HeadgearId[];

export const FACE_EXTRA_IDS = [
  "none",
  "cool_specs",
  "monocle",
  "star_glasses",
  "cheek_sparkles",
  "sleep_bubble",
  "dots_blush",
  "wink_sticker",
] as const satisfies readonly FaceExtraId[];

export const NECK_WEAR_IDS = [
  "none",
  "bow_clip",
  "trainer_band",
  "medal_pin",
  "mini_float",
  "ruff_collar",
  "dorsal_spike",
  "side_jets",
] as const satisfies readonly NeckWearId[];

/** Стабильный набор косметики для ботов / превью по числовому сидy. */
export function cosmeticsForSeed(seed: number): {
  headgear: HeadgearId;
  faceExtra: FaceExtraId;
  neckWear: NeckWearId;
} {
  const h = Math.imul(seed, 1103515245);
  return {
    headgear: HEADGEAR_IDS[Math.abs(h) % HEADGEAR_IDS.length],
    faceExtra: FACE_EXTRA_IDS[Math.abs(h >> 3) % FACE_EXTRA_IDS.length],
    neckWear: NECK_WEAR_IDS[Math.abs(h >> 7) % NECK_WEAR_IDS.length],
  };
}

function parseId<T extends string>(raw: string | null | undefined, allowed: readonly T[], fallback: T): T {
  if (!raw) return fallback;
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

export function parseHeadgearId(raw: string | null | undefined): HeadgearId {
  return parseId(raw, HEADGEAR_IDS, "none");
}

export function parseFaceExtraId(raw: string | null | undefined): FaceExtraId {
  return parseId(raw, FACE_EXTRA_IDS, "none");
}

export function parseNeckWearId(raw: string | null | undefined): NeckWearId {
  return parseId(raw, NECK_WEAR_IDS, "none");
}

/** Короткие подписи для гардероба (англ. UI как в онбординге). */
export const HEADGEAR_LABELS: Record<HeadgearId, string> = {
  none: "Bare",
  halo_ring: "Halo ring",
  bobble_antennae: "Bobble antennae",
  tiny_crown: "Tiny crown",
  sport_visor: "Sport visor",
  striped_headband: "Striped headband",
  party_cone: "Party cone",
  orbit_dots: "Orbit dots",
  foam_horns: "Foam horns",
  ufo_dish: "UFO dish",
};

export const FACE_EXTRA_LABELS: Record<FaceExtraId, string> = {
  none: "Plain face",
  cool_specs: "Cool specs",
  monocle: "Monocle",
  star_glasses: "Star glasses",
  cheek_sparkles: "Cheek sparkles",
  sleep_bubble: "Sleep bubble",
  dots_blush: "Dot blush",
  wink_sticker: "Wink sticker",
};

export const NECK_WEAR_LABELS: Record<NeckWearId, string> = {
  none: "No neck gear",
  bow_clip: "Bow clip",
  trainer_band: "Trainer band",
  medal_pin: "Medal pin",
  mini_float: "Mini float",
  ruff_collar: "Ruff collar",
  dorsal_spike: "Dorsal spike",
  side_jets: "Side jets",
};
