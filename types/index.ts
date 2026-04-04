/** Все типы жгутика — единый каталог для гардероба, БД и лобби. */
export const ALL_TAIL_TYPES = [
  "ribbon",
  "fin",
  "comet",
  "bubble",
  "trail",
  "vee",
  "hook",
  "corkscrew",
  "paddle",
  "coil",
  "plume",
  "bolt",
  "dotted",
] as const;

export type TailType = (typeof ALL_TAIL_TYPES)[number];

export const TAIL_LABELS: Record<TailType, string> = {
  ribbon: "Ribbon stream",
  fin: "Fin blade",
  comet: "Comet streak",
  bubble: "Bubble train",
  trail: "Dust trail",
  vee: "V-split",
  hook: "Hook curl",
  corkscrew: "Corkscrew twist",
  paddle: "Paddle blade",
  coil: "Spring coil",
  plume: "Soft plume",
  bolt: "Zap bolt",
  dotted: "Dotted tail",
};
export type AuraType = "none" | "pulse" | "rings" | "spark";
export type ColorTheme =
  | "electric"
  | "magenta"
  | "cyan"
  | "gold"
  | "slime"
  | "void";

/** Головной убор / шапка — только мультяшный флейр для чата. */
export type HeadgearId =
  | "none"
  | "halo_ring"
  | "bobble_antennae"
  | "tiny_crown"
  | "sport_visor"
  | "striped_headband"
  | "party_cone"
  | "orbit_dots"
  | "foam_horns"
  | "ufo_dish";

/** Очки, наклейки у лица. */
export type FaceExtraId =
  | "none"
  | "cool_specs"
  | "monocle"
  | "star_glasses"
  | "cheek_sparkles"
  | "sleep_bubble"
  | "dots_blush"
  | "wink_sticker";

/** Аксессуар у «шеи» / торса. */
export type NeckWearId =
  | "none"
  | "bow_clip"
  | "trainer_band"
  | "medal_pin"
  | "mini_float"
  | "ruff_collar"
  | "dorsal_spike"
  | "side_jets";

export interface AvatarLoadout {
  avatarName: string;
  colorTheme: ColorTheme;
  tailType: TailType;
  auraEffect: AuraType;
  headgear: HeadgearId;
  faceExtra: FaceExtraId;
  neckWear: NeckWearId;
}

export interface ProfileCardData {
  nickname: string;
  avatarName: string;
  title: string;
  tagline: string;
  colorTheme: ColorTheme;
  tailType: TailType;
  auraEffect: AuraType;
  headgear: HeadgearId;
  faceExtra: FaceExtraId;
  neckWear: NeckWearId;
  division: string;
  ovr: number;
  wins: number;
  streak: number;
  badges: string[];
}

export interface LobbyPresenceRow {
  id: string;
  room_slug: string;
  profile_id: string;
  pos_x: number;
  pos_y: number;
  in_queue: boolean;
  updated_at: string;
  nickname?: string;
  avatar?: AvatarLoadout;
}

export interface ChatMessageRow {
  id: string;
  room_slug: string;
  profile_id: string;
  body: string;
  created_at: string;
  nickname?: string;
}

export interface RaceParticipant {
  profileId: string;
  nickname: string;
  loadout: AvatarLoadout;
  ovr: number;
}
