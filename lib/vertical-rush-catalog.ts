/**
 * Pickups & obstacles for vertical rush (cartoon / parody wellness vibe, non-explicit).
 * Buffs / debuffs: HP, speed, toughness, max HP, shooting vs junk food hazards.
 */

export type GoodId = "zinc" | "omega" | "garlic" | "onion_ring" | "citrus";
export type BadId = "chips" | "candy" | "soda" | "fried_ring" | "sugar_cube";
export type ObstacleId = "laptop" | "shower" | "belt" | "stress" | "dry_wind";

export const GOOD_ITEMS: {
  id: GoodId;
  label: string;
  hint: string;
  color: string;
}[] = [
  { id: "zinc", label: "Zinc sparkle", hint: "+HP & speed, grey face — collect up to 5", color: "#a5f3fc" },
  { id: "omega", label: "Omega wave", hint: "+speed; yellow bubble blocks 2 bumps", color: "#7dd3fc" },
  { id: "garlic", label: "Garlic ward", hint: "rare: +max HP, heal, armor — up to 5", color: "#fef08a" },
  { id: "onion_ring", label: "Onion ring", hint: "+max HP; green whiff blocks 1 bump", color: "#fde047" },
  { id: "citrus", label: "Citrus zap", hint: "2s comet: invincible, super speed, smash walls/rivals + shots", color: "#bef264" },
];

export const BAD_ITEMS: {
  id: BadId;
  label: string;
  hint: string;
  color: string;
}[] = [
  { id: "chips", label: "Chip fog", hint: "slows you", color: "#d4a574" },
  { id: "candy", label: "Candy glaze", hint: "sticky, −HP", color: "#f472b6" },
  { id: "soda", label: "Soda bloat", hint: "−HP, sluggish", color: "#38bdf8" },
  { id: "fried_ring", label: "Fried ring", hint: "grease, speed down", color: "#eab308" },
  { id: "sugar_cube", label: "Sugar crash", hint: "−HP, brief stun", color: "#e2e8f0" },
];

export const OBSTACLES: {
  id: ObstacleId;
  label: string;
  hint: string;
  color: string;
  damage: number;
}[] = [
  { id: "laptop", label: "Hot laptop", hint: "wall — collision damage", color: "#94a3b8", damage: 14 },
  { id: "shower", label: "Cold shower", hint: "wall — collision damage", color: "#38bdf8", damage: 10 },
  { id: "belt", label: "Tight belt", hint: "wall — collision damage", color: "#78716c", damage: 16 },
  { id: "stress", label: "Stress knot", hint: "wall — collision damage", color: "#c084fc", damage: 9 },
  { id: "dry_wind", label: "Dry gust", hint: "wall — collision damage", color: "#a8a29e", damage: 7 },
];
