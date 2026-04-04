"use client";

import type { OnboardingInput } from "@/lib/validation";
import type { ProfileCardData } from "@/types";
import { computeLoadoutStats } from "@/lib/avatar-stats";
import { parseFaceExtraId, parseHeadgearId, parseNeckWearId } from "@/lib/loadout-cosmetics";

const KEY = "ovum_rush_profile_v1";

export type StoredProfile = OnboardingInput & {
  id: string;
  wins: number;
  streak: number;
  podiums: number;
  division: string;
  badges: string[];
};

export function loadLocalProfile(): StoredProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<StoredProfile>;
    return {
      ...p,
      id: p.id ?? createGuestProfileId(),
      wins: p.wins ?? 0,
      streak: p.streak ?? 0,
      podiums: p.podiums ?? 0,
      division: p.division ?? "Rookie Neon",
      badges: p.badges ?? [],
      headgear: parseHeadgearId(typeof p.headgear === "string" ? p.headgear : undefined),
      faceExtra: parseFaceExtraId(typeof p.faceExtra === "string" ? p.faceExtra : undefined),
      neckWear: parseNeckWearId(typeof p.neckWear === "string" ? p.neckWear : undefined),
    } as StoredProfile;
  } catch {
    return null;
  }
}

export function saveLocalProfile(data: StoredProfile) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearLocalProfile() {
  localStorage.removeItem(KEY);
}

export function storedToCard(p: StoredProfile): ProfileCardData {
  const stats = computeLoadoutStats({
    avatarName: p.avatarName,
    colorTheme: p.colorTheme,
    tailType: p.tailType,
    auraEffect: p.auraEffect,
    headgear: p.headgear,
    faceExtra: p.faceExtra,
    neckWear: p.neckWear,
  });
  return {
    nickname: p.nickname,
    avatarName: p.avatarName,
    title: p.title,
    tagline: p.tagline,
    colorTheme: p.colorTheme,
    tailType: p.tailType,
    auraEffect: p.auraEffect,
    headgear: p.headgear,
    faceExtra: p.faceExtra,
    neckWear: p.neckWear,
    division: p.division,
    ovr: stats.ovr,
    wins: p.wins,
    streak: p.streak,
    badges: p.badges,
  };
}

export function createGuestProfileId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `guest-${Date.now()}`;
}

/** Minimal profile from nickname only (defaults for customization). */
export function defaultStoredProfile(nickname: string, id?: string): StoredProfile {
  return {
    nickname: nickname.trim(),
    avatarName: "SpringBean",
    colorTheme: "electric",
    tailType: "ribbon",
    auraEffect: "pulse",
    headgear: "none",
    faceExtra: "none",
    neckWear: "none",
    title: "Rookie",
    tagline: "Just spawned in.",
    id: id ?? createGuestProfileId(),
    wins: 0,
    streak: 0,
    podiums: 0,
    division: "Rookie Neon",
    badges: ["Fresh Spawn"],
  };
}
