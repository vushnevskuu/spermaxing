/**
 * Pickups & obstacles for vertical rush (cartoon / parody wellness vibe, non-explicit).
 */

export type GoodId = "zinc" | "omega" | "garlic" | "onion_ring" | "citrus";
export type BadId = "chips" | "candy" | "soda" | "fried_ring" | "sugar_cube";
export type ObstacleId = "laptop" | "shower" | "belt" | "stress" | "dry_wind";

export const GOOD_ITEMS: {
  id: GoodId;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { id: "zinc", label: "Zinc sparkle", emoji: "✦", color: "#a5f3fc" },
  { id: "omega", label: "Omega wave", emoji: "〰", color: "#7dd3fc" },
  { id: "garlic", label: "Garlic ward", emoji: "🧄", color: "#fef08a" },
  { id: "onion_ring", label: "Onion ring", emoji: "⭕", color: "#fde047" },
  { id: "citrus", label: "Citrus zap", emoji: "🍋", color: "#bef264" },
];

export const BAD_ITEMS: {
  id: BadId;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { id: "chips", label: "Chip fog", emoji: "🟫", color: "#d4a574" },
  { id: "candy", label: "Candy glaze", emoji: "🍬", color: "#f472b6" },
  { id: "soda", label: "Soda bloat", emoji: "🥤", color: "#38bdf8" },
  { id: "fried_ring", label: "Fried ring", emoji: "⭘", color: "#eab308" },
  { id: "sugar_cube", label: "Sugar crash", emoji: "⬜", color: "#e2e8f0" },
];

export const OBSTACLES: {
  id: ObstacleId;
  label: string;
  emoji: string;
  color: string;
  damage: number;
}[] = [
  { id: "laptop", label: "Hot laptop", emoji: "💻", color: "#94a3b8", damage: 14 },
  { id: "shower", label: "Cold shower", emoji: "🚿", color: "#38bdf8", damage: 10 },
  { id: "belt", label: "Tight belt", emoji: "⛓", color: "#78716c", damage: 16 },
  { id: "stress", label: "Stress knot", emoji: "🪢", color: "#c084fc", damage: 9 },
  { id: "dry_wind", label: "Dry gust", emoji: "〰", color: "#a8a29e", damage: 7 },
];
