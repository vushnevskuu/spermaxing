import type { AvatarLoadout, ColorTheme, TailType, AuraType } from "@/types";

const themeSpeed: Record<ColorTheme, number> = {
  electric: 2,
  magenta: 1,
  cyan: 3,
  gold: 1,
  slime: 2,
  void: 4,
};

const tailHandling: Record<TailType, number> = {
  ribbon: 3,
  fin: 4,
  comet: 2,
  bubble: 5,
  trail: 3,
  vee: 4,
  hook: 3,
  corkscrew: 4,
  paddle: 2,
  coil: 5,
  plume: 5,
  bolt: 3,
  dotted: 4,
};

const auraBoost: Record<AuraType, number> = {
  none: 1,
  pulse: 2,
  rings: 3,
  spark: 4,
};

export function computeLoadoutStats(loadout: AvatarLoadout) {
  const speed = 60 + themeSpeed[loadout.colorTheme] * 5;
  const handling = 55 + tailHandling[loadout.tailType] * 4;
  const boost = 50 + auraBoost[loadout.auraEffect] * 5;
  const stamina = 58 + (6 - themeSpeed[loadout.colorTheme]) * 3;
  const ovr = Math.round((speed + handling + boost + stamina) / 4);
  return { speed, handling, boost, stamina, ovr };
}

export function raceDurationMs(seed: number): number {
  const base = 15000 + (Math.abs(seed) % 10000);
  return Math.min(25000, Math.max(15000, base));
}
