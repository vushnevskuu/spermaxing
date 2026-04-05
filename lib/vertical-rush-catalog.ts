/**
 * Pickups & obstacles for vertical rush (cartoon / parody wellness vibe, non-explicit).
 * На треке: импульс (pace) — «жизнь» и скорость; баффы поднимают импульс / потолок.
 */

export type GoodId = "zinc" | "omega" | "garlic" | "onion_ring" | "citrus";
export type BadId = "chips" | "candy" | "soda" | "fried_ring" | "sugar_cube";
export type ObstacleId = "laptop" | "shower" | "belt" | "stress" | "dry_wind";

/** Короткий тег на canvas под иконкой (читаемость с дистанции). */
export const GOOD_TRACK_TAGS: Record<GoodId, string> = {
  zinc: "ZN",
  omega: "O3",
  garlic: "GL",
  onion_ring: "ON",
  citrus: "CT",
};

export const BAD_TRACK_TAGS: Record<BadId, string> = {
  chips: "CH",
  candy: "CN",
  soda: "SD",
  fried_ring: "FR",
  sugar_cube: "SG",
};

export const OBSTACLE_TRACK_TAGS: Record<ObstacleId, string> = {
  laptop: "PC",
  shower: "SH",
  belt: "BT",
  stress: "XX",
  dry_wind: "WND",
};

export const GOOD_ITEMS: {
  id: GoodId;
  label: string;
  hint: string;
  color: string;
}[] = [
  { id: "zinc", label: "Zinc sparkle", hint: "+impulse & stride (max 5), grey face", color: "#a5f3fc" },
  { id: "omega", label: "Omega wave", hint: "+stride; yellow bubble ×2 bumps", color: "#7dd3fc" },
  { id: "garlic", label: "Garlic ward", hint: "rare: +max impulse, heal, armor (max 5)", color: "#fef08a" },
  { id: "onion_ring", label: "Onion ring", hint: "+max impulse; green whiff ×1", color: "#fde047" },
  { id: "citrus", label: "Citrus zap", hint: "2s comet: invincible, smash, shots", color: "#bef264" },
];

export const BAD_ITEMS: {
  id: BadId;
  label: string;
  hint: string;
  color: string;
}[] = [
  { id: "chips", label: "Chip fog", hint: "−stride, slow decay", color: "#d4a574" },
  { id: "candy", label: "Candy glaze", hint: "−impulse, sticky stride", color: "#f472b6" },
  { id: "soda", label: "Soda bloat", hint: "−impulse, sluggish", color: "#38bdf8" },
  { id: "fried_ring", label: "Fried ring", hint: "greasy −stride", color: "#eab308" },
  { id: "sugar_cube", label: "Sugar crash", hint: "−impulse, brief stun", color: "#e2e8f0" },
];

export const OBSTACLES: {
  id: ObstacleId;
  label: string;
  hint: string;
  color: string;
  damage: number;
}[] = [
  { id: "laptop", label: "Hot laptop", hint: "wall — −impulse", color: "#94a3b8", damage: 14 },
  { id: "shower", label: "Cold shower", hint: "wall — −impulse", color: "#38bdf8", damage: 10 },
  { id: "belt", label: "Tight belt", hint: "wall — −impulse", color: "#78716c", damage: 16 },
  { id: "stress", label: "Stress knot", hint: "wall — −impulse", color: "#c084fc", damage: 9 },
  { id: "dry_wind", label: "Dry gust", hint: "wall — −impulse", color: "#a8a29e", damage: 7 },
];
