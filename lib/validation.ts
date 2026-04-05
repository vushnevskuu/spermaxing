import { z } from "zod";
import { ALL_TAIL_TYPES, type TailType } from "@/types";
import { FACE_EXTRA_IDS, HEADGEAR_IDS, NECK_WEAR_IDS } from "@/lib/loadout-cosmetics";
import {
  LOBBY_NICKNAME_MAX,
  LOBBY_NICKNAME_MIN,
  LOBBY_NICKNAME_PATTERN,
} from "@/lib/nickname-policy";

export const nicknameSchema = z
  .string()
  .min(LOBBY_NICKNAME_MIN, "At least 2 characters")
  .max(LOBBY_NICKNAME_MAX, "Max 20 characters")
  .regex(
    LOBBY_NICKNAME_PATTERN,
    "Latin letters, numbers, space, dot, or hyphen only (no Cyrillic)."
  );

const headgearSchema = z.enum(HEADGEAR_IDS);
const faceExtraSchema = z.enum(FACE_EXTRA_IDS);
const neckWearSchema = z.enum(NECK_WEAR_IDS);

export const onboardingSchema = z.object({
  nickname: nicknameSchema,
  avatarName: z.string().min(2).max(24),
  colorTheme: z.enum(["electric", "magenta", "cyan", "gold", "slime", "void"]),
  tailType: z.enum(ALL_TAIL_TYPES as unknown as [TailType, ...TailType[]]),
  auraEffect: z.enum(["none", "pulse", "rings", "spark"]),
  headgear: headgearSchema.default("none"),
  faceExtra: faceExtraSchema.default("none"),
  neckWear: neckWearSchema.default("none"),
  title: z.string().min(2).max(32),
  tagline: z.string().min(2).max(80),
});

export const chatBodySchema = z.string().min(1).max(280);

export const chatSendSchema = z.object({
  body: chatBodySchema,
  recipientProfileId: z.string().uuid().optional().nullable(),
});

export const registerNickSchema = z.object({
  nickname: nicknameSchema,
});

export const reportSchema = z.object({
  targetProfileId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  reason: z.string().min(3).max(500),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
