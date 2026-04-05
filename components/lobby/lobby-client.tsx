"use client";

import * as React from "react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronUp, MessageSquare, Minus, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/mock-mode";
import {
  LOBBY_CHAT_HISTORY_LIMIT,
  LOBBY_ROOM_SLUG,
  PRESENCE_STALE_MS,
  PRESENCE_UPSERT_INTERVAL_MS,
} from "@/lib/constants";
import { isInEggZone } from "@/lib/egg-zone";
import { loadLocalProfile, storedToCard, type StoredProfile } from "@/lib/local-profile";
import { computeLoadoutStats } from "@/lib/avatar-stats";
import { useLobbyStore } from "@/store/lobby-store";
import { useLobbyRhythmStore } from "@/store/lobby-rhythm-store";
import { LobbyAudioBridge } from "@/components/lobby/lobby-audio-bridge";
import { LobbyEggZone } from "@/components/lobby/lobby-egg-zone";
import { VerticalRushClient } from "@/components/rush/vertical-rush-client";
import { RhythmPulseWrap } from "@/components/lobby/rhythm-pulse-wrap";
import { SwimmerAvatar } from "@/components/avatar/swimmer-avatar";
import { PlayerCard } from "@/components/profile/player-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ALL_TAIL_TYPES,
  type AvatarLoadout,
  type AuraType,
  type ColorTheme,
  type ProfileCardData,
  type TailType,
} from "@/types";
import { cosmeticsForSeed, parseFaceExtraId, parseHeadgearId, parseNeckWearId } from "@/lib/loadout-cosmetics";
import { CHAT_RATE_MS, MAX_CHAT_LEN } from "@/lib/constants";
import { sanitizePublicText } from "@/lib/sanitize";
import { parseChatCommand, parseWhisperAutocompleteState } from "@/lib/chat-parse";
import { playLobbyWhisperChime } from "@/lib/lobby-whisper-chime";
import { cn } from "@/lib/utils";
import {
  applyEggCoreRepulsion,
  applySwimmerRepulsion,
  clampLobbyPosition,
  separateSwimmersPairwise,
  SWIMMER_HIT_RADIUS,
} from "@/lib/lobby-physics";

/** Фон лобби. */
const REF = {
  bg: "#0a0a0a",
} as const;

type Swimmer = {
  profileId: string;
  x: number;
  y: number;
  nickname: string;
  loadout: AvatarLoadout;
  inQueue: boolean;
};

type ChatRow = {
  id: string;
  profileId: string;
  nickname: string;
  body: string;
  at: number;
  recipientProfileId: string | null;
  recipientNickname: string | null;
};

/** Порог смещения за тик: ниже — чаще считаем «движется», хвост в активной анимации. */
const MOVE_EPS = 0.000028;

/** Кратчайшая разница углов в градусах (−180 … 180). */
function shortestAngleDegDelta(from: number, to: number): number {
  let d = to - from;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** Сглаживание facing: сырой atan2 по шагу физики даёт дрожь → хвост с пружиной «плывёт». */
function lerpFacingDeg(from: number, to: number, t: number): number {
  return from + shortestAngleDegDelta(from, to) * t;
}

function lobbySwimmerMotion(
  prevMap: { current: Map<string, { x: number; y: number }> },
  facingMap: { current: Map<string, number> },
  id: string,
  x: number,
  y: number
): { facingDeg: number; moving: boolean } {
  const prev = prevMap.current.get(id);
  if (!prev) {
    prevMap.current.set(id, { x, y });
    return { facingDeg: facingMap.current.get(id) ?? -90, moving: false };
  }
  const dx = x - prev.x;
  const dy = y - prev.y;
  const moving = Math.hypot(dx, dy) > MOVE_EPS;
  let facingDeg = facingMap.current.get(id) ?? -90;
  if (moving) {
    const instant = (Math.atan2(dy, dx) * 180) / Math.PI;
    facingDeg = lerpFacingDeg(facingDeg, instant, 0.42);
    facingMap.current.set(id, facingDeg);
  }
  prevMap.current.set(id, { x, y });
  return { facingDeg, moving };
}

/** Один плавунец на profile_id (страховка от гонок realtime + poll). */
function dedupeSwimmersByProfileId(list: Swimmer[]): Swimmer[] {
  const m = new Map<string, Swimmer>();
  for (const sw of list) {
    m.set(sw.profileId, sw);
  }
  return [...m.values()];
}

/** Слияние списка из БД/realtime с текущей позицией локального игрока из posRef (без лишних setState на весь лобби). */
function buildDisplaySwimmers(
  swimmers: Swimmer[],
  me: StoredProfile | null,
  mock: boolean,
  posRef: MutableRefObject<{ x: number; y: number }>
): Swimmer[] {
  if (!me) return dedupeSwimmersByProfileId(swimmers);
  const loadout: AvatarLoadout = {
    avatarName: me.avatarName,
    colorTheme: me.colorTheme,
    tailType: me.tailType,
    auraEffect: me.auraEffect,
    headgear: me.headgear,
    faceExtra: me.faceExtra,
    neckWear: me.neckWear,
  };
  const lx = posRef.current.x;
  const ly = posRef.current.y;
  const localInQ = isInEggZone(lx, ly);
  const local: Swimmer = {
    profileId: me.id,
    x: lx,
    y: ly,
    nickname: me.nickname,
    loadout,
    inQueue: localInQ,
  };
  /** В mock и live локальная позиция всегда из posRef (плавное движение), остальное — из state. */
  const merged = swimmers.map((s) =>
    s.profileId === me.id ? { ...s, x: lx, y: ly, inQueue: localInQ } : s
  );
  if (!mock && !merged.some((s) => s.profileId === me.id)) {
    return dedupeSwimmersByProfileId([...merged, local]);
  }
  return dedupeSwimmersByProfileId(merged);
}

const RemoteLobbyAvatarRow = memo(function RemoteLobbyAvatarRow({
  s,
  visualRhythm,
  setSelectedProfileId,
  swimmerPrevPosRef,
  swimmerFacingRef,
}: {
  s: Swimmer;
  visualRhythm: boolean;
  setSelectedProfileId: (id: string | null) => void;
  swimmerPrevPosRef: MutableRefObject<Map<string, { x: number; y: number }>>;
  swimmerFacingRef: MutableRefObject<Map<string, number>>;
}) {
  const { facingDeg, moving } = lobbySwimmerMotion(
    swimmerPrevPosRef,
    swimmerFacingRef,
    s.profileId,
    s.x,
    s.y
  );
  return (
    <button
      type="button"
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 bg-transparent p-0 will-change-transform"
      style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}
      onClick={() => setSelectedProfileId(s.profileId)}
    >
      <RhythmPulseWrap enabled={visualRhythm}>
        <SwimmerAvatar
          colorTheme={s.loadout.colorTheme}
          tailType={s.loadout.tailType}
          auraEffect={s.loadout.auraEffect}
          headgear={s.loadout.headgear}
          faceExtra={s.loadout.faceExtra}
          neckWear={s.loadout.neckWear}
          label={s.nickname}
          facingDeg={facingDeg}
          moving={moving}
          referenceLobbyStyle
        />
      </RhythmPulseWrap>
      {s.inQueue ? (
        <Badge className="absolute -right-2 -top-2 text-[10px] shadow-none" variant="secondary">
          Q
        </Badge>
      ) : null}
    </button>
  );
});

/** Локальный игрок: позиция обновляется в RAF через ref (без setState на весь список), анимация хвоста — только этот инстанс. */
function LocalLobbyAvatar({
  me,
  posRef,
  visualRhythm,
  inQueue,
  setSelectedProfileId,
  swimmerPrevPosRef,
  swimmerFacingRef,
  animFlushRef,
  buttonRef,
}: {
  me: StoredProfile;
  posRef: MutableRefObject<{ x: number; y: number }>;
  visualRhythm: boolean;
  inQueue: boolean;
  setSelectedProfileId: (id: string | null) => void;
  swimmerPrevPosRef: MutableRefObject<Map<string, { x: number; y: number }>>;
  swimmerFacingRef: MutableRefObject<Map<string, number>>;
  animFlushRef: MutableRefObject<(() => void) | null>;
  buttonRef: RefObject<HTMLButtonElement | null>;
}) {
  const [anim, setAnim] = useState({ facingDeg: -90, moving: false });

  useLayoutEffect(() => {
    const flush = () => {
      const { facingDeg, moving } = lobbySwimmerMotion(
        swimmerPrevPosRef,
        swimmerFacingRef,
        me.id,
        posRef.current.x,
        posRef.current.y
      );
      setAnim((prev) =>
        prev.facingDeg === facingDeg && prev.moving === moving ? prev : { facingDeg, moving }
      );
    };
    animFlushRef.current = flush;
    return () => {
      if (animFlushRef.current === flush) animFlushRef.current = null;
    };
  }, [me.id, animFlushRef, posRef, swimmerFacingRef, swimmerPrevPosRef]);

  return (
    <button
      ref={buttonRef}
      type="button"
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 bg-transparent p-0 will-change-transform"
      style={{ left: `${posRef.current.x * 100}%`, top: `${posRef.current.y * 100}%` }}
      onClick={() => setSelectedProfileId(me.id)}
    >
      <RhythmPulseWrap enabled={visualRhythm}>
        <SwimmerAvatar
          colorTheme={me.colorTheme}
          tailType={me.tailType}
          auraEffect={me.auraEffect}
          headgear={me.headgear}
          faceExtra={me.faceExtra}
          neckWear={me.neckWear}
          label={me.nickname}
          facingDeg={anim.facingDeg}
          moving={anim.moving}
          referenceLobbyStyle
        />
      </RhythmPulseWrap>
      {inQueue ? (
        <Badge className="absolute -right-2 -top-2 text-[10px] shadow-none" variant="secondary">
          Q
        </Badge>
      ) : null}
    </button>
  );
}

type LobbyPlayfieldAvatarsProps = {
  swimmers: Swimmer[];
  me: StoredProfile;
  posRef: MutableRefObject<{ x: number; y: number }>;
  visualRhythm: boolean;
  inEggZone: boolean;
  setSelectedProfileId: (id: string | null) => void;
  swimmerPrevPosRef: MutableRefObject<Map<string, { x: number; y: number }>>;
  swimmerFacingRef: MutableRefObject<Map<string, number>>;
  localAvatarButtonRef: RefObject<HTMLButtonElement | null>;
  localAvatarAnimFlushRef: MutableRefObject<(() => void) | null>;
};

/** Удалённые плавунцы — только при смене `swimmers`; локальный — отдельно, без 60fps ререндера всего чата. */
function LobbyPlayfieldAvatars(props: LobbyPlayfieldAvatarsProps) {
  const {
    swimmers,
    me,
    posRef,
    visualRhythm,
    inEggZone,
    setSelectedProfileId,
    swimmerPrevPosRef,
    swimmerFacingRef,
    localAvatarButtonRef,
    localAvatarAnimFlushRef,
  } = props;

  const remoteSwimmers = useMemo(() => {
    const deduped = dedupeSwimmersByProfileId(swimmers);
    return deduped.filter((s) => s.profileId !== me.id);
  }, [swimmers, me.id]);

  return (
    <>
      {remoteSwimmers.map((s) => (
        <RemoteLobbyAvatarRow
          key={s.profileId}
          s={s}
          visualRhythm={visualRhythm}
          setSelectedProfileId={setSelectedProfileId}
          swimmerPrevPosRef={swimmerPrevPosRef}
          swimmerFacingRef={swimmerFacingRef}
        />
      ))}
      <LocalLobbyAvatar
        me={me}
        posRef={posRef}
        visualRhythm={visualRhythm}
        inQueue={inEggZone}
        setSelectedProfileId={setSelectedProfileId}
        swimmerPrevPosRef={swimmerPrevPosRef}
        swimmerFacingRef={swimmerFacingRef}
        animFlushRef={localAvatarAnimFlushRef}
        buttonRef={localAvatarButtonRef}
      />
    </>
  );
}

const BOT_NAMES = ["LagKnight", "PingQueen", "TurboToad", "PacketLossLarry"];

function profileIdSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

function parseTailType(raw: string | null | undefined): TailType | null {
  if (!raw) return null;
  return (ALL_TAIL_TYPES as readonly string[]).includes(raw) ? (raw as TailType) : null;
}

/** Стабильный тип хвоста по id, если в БД нет или значение устарело. */
function tailTypeFromProfileId(profileId: string): TailType {
  return ALL_TAIL_TYPES[Math.abs(profileIdSeed(profileId)) % ALL_TAIL_TYPES.length];
}

function defaultLoadout(seed: number): AvatarLoadout {
  const themes: ColorTheme[] = ["electric", "magenta", "cyan", "gold", "slime", "void"];
  const auras: AuraType[] = ["none", "pulse", "rings", "spark"];
  return {
    avatarName: "Bot",
    colorTheme: themes[Math.abs(seed) % themes.length],
    tailType: ALL_TAIL_TYPES[Math.abs(seed >> 3) % ALL_TAIL_TYPES.length],
    auraEffect: auras[Math.abs(seed >> 5) % auras.length],
    ...cosmeticsForSeed(seed),
  };
}

function fallbackLoadoutForProfile(profileId: string): AvatarLoadout {
  return defaultLoadout(profileIdSeed(profileId));
}

function swimmerToProfilePeekCard(s: Swimmer): ProfileCardData {
  const st = computeLoadoutStats(s.loadout);
  const seed = profileIdSeed(s.profileId);
  return {
    nickname: s.nickname,
    avatarName: s.loadout.avatarName,
    title: "Lobby swimmer",
    tagline: s.inQueue ? "In the egg queue zone" : "Cruising the lobby",
    colorTheme: s.loadout.colorTheme,
    tailType: s.loadout.tailType,
    auraEffect: s.loadout.auraEffect,
    headgear: s.loadout.headgear,
    faceExtra: s.loadout.faceExtra,
    neckWear: s.loadout.neckWear,
    division: "Lobby",
    ovr: st.ovr,
    wins: Math.abs(seed) % 50,
    streak: Math.abs(seed >> 8) % 8,
    badges: ["Lobby"],
  };
}

async function fetchProfileCardDataForLobby(profileId: string): Promise<ProfileCardData | null> {
  const supabase = createClient();
  const { data: pr, error } = await supabase
    .from("profiles")
    .select("nickname,title,tagline,division,ovr,wins,streak,badges")
    .eq("id", profileId)
    .maybeSingle();
  if (error || !pr) return null;
  const { data: av } = await supabase
    .from("avatars")
    .select("avatar_name,color_theme,tail_type,aura_effect,headgear,face_extra,neck_wear")
    .eq("profile_id", profileId)
    .maybeSingle();
  const loadout: AvatarLoadout = {
    avatarName: av?.avatar_name ?? "Swimmer",
    colorTheme: (av?.color_theme as ColorTheme) ?? "electric",
    tailType: parseTailType(av?.tail_type) ?? tailTypeFromProfileId(profileId),
    auraEffect: (av?.aura_effect as AuraType) ?? "pulse",
    headgear: parseHeadgearId(av?.headgear),
    faceExtra: parseFaceExtraId(av?.face_extra),
    neckWear: parseNeckWearId(av?.neck_wear),
  };
  const computed = computeLoadoutStats(loadout);
  const ovr = pr.ovr != null && pr.ovr > 0 ? pr.ovr : computed.ovr;
  const badges = Array.isArray(pr.badges) ? pr.badges : [];
  return {
    nickname: pr.nickname,
    avatarName: loadout.avatarName,
    title: pr.title?.trim() || "Rookie",
    tagline: pr.tagline?.trim() ?? "",
    colorTheme: loadout.colorTheme,
    tailType: loadout.tailType,
    auraEffect: loadout.auraEffect,
    headgear: loadout.headgear,
    faceExtra: loadout.faceExtra,
    neckWear: loadout.neckWear,
    division: pr.division?.trim() || "Rookie Neon",
    ovr,
    wins: pr.wins ?? 0,
    streak: pr.streak ?? 0,
    badges,
  };
}

function useMockLobby(): boolean {
  if (typeof window === "undefined") return true;
  if (!isSupabaseConfigured()) return true;
  return Boolean(sessionStorage.getItem("ovum_rush_guest"));
}

export function LobbyClient() {
  const router = useRouter();
  const [me, setMe] = useState<StoredProfile | null>(null);
  const mock = useMockLobby();
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [chatHistoryStatus, setChatHistoryStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [chatHistoryError, setChatHistoryError] = useState<string | null>(null);
  const [chatBootToken, setChatBootToken] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const chatScrollViewportRef = useRef<HTMLDivElement>(null);
  const chatScrollPrevLenRef = useRef(0);
  const [whisperSuggestHi, setWhisperSuggestHi] = useState(0);
  const [whisperTo, setWhisperTo] = useState<{ id: string; nick: string } | null>(null);
  const chatFocusedRef = useRef(false);
  const [online, setOnline] = useState(1);
  const lastChat = useRef(0);
  const posRef = useRef({ x: 0.5, y: 0.55 });
  const keys = useRef<Record<string, boolean>>({});
  const inEggZone = useLobbyStore((s) => s.inEggZone);
  const setInEggZone = useLobbyStore((s) => s.setInEggZone);
  const setQueueHint = useLobbyStore((s) => s.setQueueHint);
  const selectedProfileId = useLobbyStore((s) => s.selectedProfileId);
  const setSelectedProfileId = useLobbyStore((s) => s.setSelectedProfileId);
  const [reportOpen, setReportOpen] = useState(false);
  const [eggArcadeOpen, setEggArcadeOpen] = useState(false);
  const eggArcadeOpenRef = useRef(false);
  eggArcadeOpenRef.current = eggArcadeOpen;
  const [reportTarget, setReportTarget] = useState<{ id: string; nick: string } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [peekCard, setPeekCard] = useState<ProfileCardData | null>(null);
  const [peekStatus, setPeekStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const matchLock = useRef(false);
  const matchIv = useRef<number | null>(null);
  const swimmerPrevPosRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const swimmerFacingRef = useRef<Map<string, number>>(new Map());
  /** Other swimmers' positions for local repulsion (live: из swimmersRef; mock: из тика ботов). */
  const othersPositionsRef = useRef<{ x: number; y: number }[]>([]);
  /** Persistent bot positions in mock lobby. */
  const mockBotsStateRef = useRef<Swimmer[] | null>(null);
  const swimmersRef = useRef<Swimmer[]>(swimmers);
  swimmersRef.current = swimmers;
  const localAvatarButtonRef = useRef<HTMLButtonElement | null>(null);
  const localAvatarAnimFlushRef = useRef<(() => void) | null>(null);
  const prevEggZoneRef = useRef<boolean | null>(null);
  const presenceUserIdRef = useRef<string | null>(null);
  const playfieldSurfaceRef = useRef<HTMLDivElement | null>(null);
  const pointerSteerActiveRef = useRef(false);

  const lobbyMusicOn = useLobbyRhythmStore((s) => s.lobbyMusicOn);
  const setLobbyMusicOn = useLobbyRhythmStore((s) => s.setLobbyMusicOn);
  const reduceMotion = useReducedMotion();
  const visualRhythm = Boolean(lobbyMusicOn && !reduceMotion);

  const syncLocalAvatarDom = useCallback(() => {
    const el = localAvatarButtonRef.current;
    if (el) {
      el.style.left = `${posRef.current.x * 100}%`;
      el.style.top = `${posRef.current.y * 100}%`;
    }
    localAvatarAnimFlushRef.current?.();
  }, []);

  const applyPointerSteer = useCallback(
    (clientX: number, clientY: number, el: HTMLDivElement) => {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return;
      posRef.current.x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      posRef.current.y = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
      clampLobbyPosition(posRef.current);
      syncLocalAvatarDom();
    },
    [syncLocalAvatarDom]
  );

  const onPlayfieldPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (chatFocusedRef.current) return;
      const tar = e.target as HTMLElement | null;
      if (!tar || !e.currentTarget.contains(tar)) return;
      if (tar.closest("[data-lobby-chrome], button, a, input, textarea")) return;
      pointerSteerActiveRef.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      applyPointerSteer(e.clientX, e.clientY, e.currentTarget);
    },
    [applyPointerSteer]
  );

  const onPlayfieldPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointerSteerActiveRef.current) return;
      applyPointerSteer(e.clientX, e.clientY, e.currentTarget);
    },
    [applyPointerSteer]
  );

  const onPlayfieldPointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointerSteerActiveRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem("ovum_lobby_music") === "1") {
        setLobbyMusicOn(true);
      }
    } catch {
      /* ignore */
    }
  }, [setLobbyMusicOn]);

  useEffect(() => {
    const p = loadLocalProfile();
    if (!p) {
      router.replace("/enter");
      return;
    }
    setMe(p);
    posRef.current = { x: 0.5, y: 0.55 };
  }, [router]);

  const hydrate = useCallback(
    async (ids: string[]) => {
      if (mock || ids.length === 0) return new Map<string, { nick: string; loadout: AvatarLoadout }>();
      const supabase = createClient();
      const { data: profs } = await supabase.from("profiles").select("id,nickname").in("id", ids);
      const { data: avs } = await supabase
        .from("avatars")
        .select("profile_id,avatar_name,color_theme,tail_type,aura_effect,headgear,face_extra,neck_wear")
        .in("profile_id", ids);
      const map = new Map<string, { nick: string; loadout: AvatarLoadout }>();
      for (const id of ids) {
        const pr = profs?.find((x) => x.id === id);
        const av = avs?.find((x) => x.profile_id === id);
        map.set(id, {
          nick: pr?.nickname ?? id.slice(0, 6),
          loadout: {
            avatarName: av?.avatar_name ?? "Swimmer",
            colorTheme: (av?.color_theme as ColorTheme) ?? "electric",
            tailType: parseTailType(av?.tail_type) ?? tailTypeFromProfileId(id),
            auraEffect: (av?.aura_effect as AuraType) ?? "pulse",
            headgear: parseHeadgearId(av?.headgear),
            faceExtra: parseFaceExtraId(av?.face_extra),
            neckWear: parseNeckWearId(av?.neck_wear),
          },
        });
      }
      return map;
    },
    [mock]
  );

  const syncPresenceFromDb = useCallback(async () => {
    if (!me || mock) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("presence_rooms")
      .select("*")
      .eq("room_slug", LOBBY_ROOM_SLUG);
    if (!data?.length) {
      setSwimmers([]);
      return;
    }
    const byId = new Map<string, (typeof data)[0]>();
    for (const r of data) {
      byId.set(r.profile_id, r);
    }
    const uniqueRows = [...byId.values()];
    const staleBefore = new Date(Date.now() - PRESENCE_STALE_MS).toISOString();
    const freshRows = uniqueRows.filter((r) => r.updated_at >= staleBefore);
    const ids = freshRows.map((r) => r.profile_id);
    const map = await hydrate(ids);
    setSwimmers(
      freshRows.map((r) => ({
        profileId: r.profile_id,
        x: r.pos_x,
        y: r.pos_y,
        nickname: map.get(r.profile_id)?.nick ?? "?",
        loadout: map.get(r.profile_id)?.loadout ?? fallbackLoadoutForProfile(r.profile_id),
        inQueue: r.in_queue,
      }))
    );
  }, [me, mock, hydrate]);

  useEffect(() => {
    void syncPresenceFromDb();
  }, [syncPresenceFromDb]);

  /** Редкий опрос БД (основной канал — Realtime; частый poll усиливает лаги). */
  useEffect(() => {
    if (!me || mock) return;
    const id = window.setInterval(() => {
      void syncPresenceFromDb();
    }, 5000);
    return () => clearInterval(id);
  }, [me, mock, syncPresenceFromDb]);

  /* Mock bots + local (persistent bots + pairwise + egg repulsion) */
  useEffect(() => {
    if (!me) return;
    if (!mock) {
      mockBotsStateRef.current = null;
      return;
    }
    if (!mockBotsStateRef.current) {
      mockBotsStateRef.current = BOT_NAMES.map((n, i) => ({
        profileId: `bot-${i}`,
        x: 0.2 + (i % 3) * 0.22,
        y: 0.35 + (i % 2) * 0.2,
        nickname: n,
        loadout: { ...defaultLoadout(i * 9973), tailType: ALL_TAIL_TYPES[i % ALL_TAIL_TYPES.length] },
        inQueue: false,
      }));
    }
    const tick = setInterval(() => {
      const list = mockBotsStateRef.current;
      if (!list) return;
      const t = Date.now() / 1000;
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        b.x += Math.sin(t + i) * 0.004;
        b.y += Math.cos(t / 0.9 + i) * 0.004;
        clampLobbyPosition(b);
      }
      const pts = list.map((b) => ({ x: b.x, y: b.y }));
      pts.push({ x: posRef.current.x, y: posRef.current.y });
      separateSwimmersPairwise(pts, SWIMMER_HIT_RADIUS, 3, 0.4);
      for (let i = 0; i < list.length; i++) {
        list[i].x = pts[i].x;
        list[i].y = pts[i].y;
      }
      posRef.current.x = pts[pts.length - 1].x;
      posRef.current.y = pts[pts.length - 1].y;
      for (const b of list) {
        applyEggCoreRepulsion(b);
        clampLobbyPosition(b);
      }
      applyEggCoreRepulsion(posRef.current);
      clampLobbyPosition(posRef.current);
      othersPositionsRef.current = list.map((b) => ({ x: b.x, y: b.y }));
      setSwimmers(() => {
        const local: Swimmer = {
          profileId: me.id,
          x: posRef.current.x,
          y: posRef.current.y,
          nickname: me.nickname,
          loadout: {
            avatarName: me.avatarName,
            colorTheme: me.colorTheme,
            tailType: me.tailType,
            auraEffect: me.auraEffect,
            headgear: me.headgear,
            faceExtra: me.faceExtra,
            neckWear: me.neckWear,
          },
          inQueue: isInEggZone(posRef.current.x, posRef.current.y),
        };
        const moved = list.map((b) => ({
          ...b,
          inQueue: isInEggZone(b.x, b.y),
        }));
        setOnline(moved.length + 1);
        return [...moved, local];
      });
    }, 120);
    setMessages([
      {
        id: "m0",
        profileId: "system",
        nickname: "System",
        body: "Mock lobby. Say goes to everyone. Whisper: click a player or /w Name message",
        at: Date.now(),
        recipientProfileId: null,
        recipientNickname: null,
      },
    ]);
    return () => clearInterval(tick);
  }, [me, mock]);

  /* Supabase presence */
  useEffect(() => {
    if (!me || mock) return;
    const supabase = createClient();
    let alive = true;
    const channel = supabase
      .channel("lobby-main")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "presence_rooms",
          filter: `room_slug=eq.${LOBBY_ROOM_SLUG}`,
        },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { profile_id?: string } | null;
            const pid = oldRow?.profile_id;
            if (pid) {
              setSwimmers((prev) => prev.filter((sw) => sw.profileId !== pid));
            }
            return;
          }
          const row = payload.new as {
            profile_id: string;
            pos_x: number;
            pos_y: number;
            in_queue: boolean;
          } | null;
          if (!row?.profile_id) return;

          let hadExisting = false;
          setSwimmers((prev) => {
            const existing = prev.find((sw) => sw.profileId === row.profile_id);
            if (existing) {
              hadExisting = true;
              return prev.map((sw) =>
                sw.profileId === row.profile_id
                  ? {
                      ...sw,
                      x: row.pos_x,
                      y: row.pos_y,
                      inQueue: row.in_queue,
                    }
                  : sw
              );
            }
            return prev;
          });

          if (hadExisting) return;
          if (!alive) return;

          const map = await hydrate([row.profile_id]);
          const meta = map.get(row.profile_id);
          if (!meta || !alive) return;
          setSwimmers((prev) => {
            if (prev.some((sw) => sw.profileId === row.profile_id)) {
              return prev.map((sw) =>
                sw.profileId === row.profile_id
                  ? {
                      ...sw,
                      x: row.pos_x,
                      y: row.pos_y,
                      inQueue: row.in_queue,
                    }
                  : sw
              );
            }
            return [
              ...prev.filter((sw) => sw.profileId !== row.profile_id),
              {
                profileId: row.profile_id,
                x: row.pos_x,
                y: row.pos_y,
                nickname: meta.nick,
                loadout: meta.loadout,
                inQueue: row.in_queue,
              },
            ];
          });
        }
      )
      .subscribe();

    void supabase.auth.getUser().then(({ data: u }) => {
      if (u.user) presenceUserIdRef.current = u.user.id;
    });

    const iv = window.setInterval(async () => {
      if (!alive) return;
      const uid = presenceUserIdRef.current;
      if (!uid) return;
      const z = isInEggZone(posRef.current.x, posRef.current.y);
      await supabase.from("presence_rooms").upsert(
        {
          room_slug: LOBBY_ROOM_SLUG,
          profile_id: uid,
          pos_x: posRef.current.x,
          pos_y: posRef.current.y,
          in_queue: z,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "room_slug,profile_id" }
      );
    }, PRESENCE_UPSERT_INTERVAL_MS);

    return () => {
      alive = false;
      clearInterval(iv);
      supabase.removeChannel(channel);
      const uid = presenceUserIdRef.current;
      if (uid) {
        void supabase
          .from("presence_rooms")
          .delete()
          .eq("room_slug", LOBBY_ROOM_SLUG)
          .eq("profile_id", uid);
      }
    };
  }, [me, mock, hydrate]);

  useEffect(() => {
    setOnline(Math.max(1, swimmers.length));
  }, [swimmers]);

  /* Чат: история из БД, затем Realtime */
  useEffect(() => {
    if (!me || mock) return;
    const myProfileId = me.id;
    const supabase = createClient();
    let cancelled = false;
    let chatChannel: RealtimeChannel | null = null;

    async function bootChat() {
      setChatHistoryStatus("loading");
      setChatHistoryError(null);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, profile_id, body, created_at, recipient_profile_id")
        .eq("room_slug", LOBBY_ROOM_SLUG)
        .order("created_at", { ascending: false })
        .limit(LOBBY_CHAT_HISTORY_LIMIT);
      if (cancelled) return;
      if (error) {
        setChatHistoryStatus("error");
        setChatHistoryError(error.message);
        return;
      }
      const rowsRaw = data ?? [];
      const rows = [...rowsRaw].reverse();
      const idSet = new Set<string>();
      for (const r of rows) {
        idSet.add(r.profile_id);
        if (r.recipient_profile_id) idSet.add(r.recipient_profile_id);
      }
      const map = await hydrate([...idSet]);
      if (cancelled) return;
      const chatRows: ChatRow[] = rows.map((r) => ({
        id: r.id,
        profileId: r.profile_id,
        nickname: map.get(r.profile_id)?.nick ?? "???",
        body: r.body,
        at: new Date(r.created_at).getTime(),
        recipientProfileId: r.recipient_profile_id ?? null,
        recipientNickname: r.recipient_profile_id
          ? (map.get(r.recipient_profile_id)?.nick ?? "???")
          : null,
      }));
      setMessages(chatRows);
      setChatHistoryStatus("ready");

      if (cancelled) return;
      chatChannel = supabase
        .channel("chat-main")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `room_slug=eq.${LOBBY_ROOM_SLUG}`,
          },
          async (payload) => {
            const m = payload.new as {
              id: string;
              profile_id: string;
              body: string;
              created_at: string;
              recipient_profile_id?: string | null;
            };
            const nickFromLobby = (id: string) =>
              swimmersRef.current.find((s) => s.profileId === id)?.nickname;
            const need: string[] = [];
            if (!nickFromLobby(m.profile_id)) need.push(m.profile_id);
            if (m.recipient_profile_id && !nickFromLobby(m.recipient_profile_id)) {
              need.push(m.recipient_profile_id);
            }
            const hmap =
              need.length > 0
                ? await hydrate(need)
                : new Map<string, { nick: string; loadout: AvatarLoadout }>();
            const nick =
              nickFromLobby(m.profile_id) ?? hmap.get(m.profile_id)?.nick ?? "???";
            const recipientNick = m.recipient_profile_id
              ? nickFromLobby(m.recipient_profile_id) ??
                hmap.get(m.recipient_profile_id)?.nick ??
                "???"
              : null;
            const incomingWhisperToMe =
              Boolean(m.recipient_profile_id) &&
              m.recipient_profile_id === myProfileId &&
              m.profile_id !== myProfileId;
            setMessages((prev) => {
              if (prev.some((x) => x.id === m.id)) return prev;
              if (incomingWhisperToMe) playLobbyWhisperChime();
              return [
                ...prev,
                {
                  id: m.id,
                  profileId: m.profile_id,
                  nickname: nick,
                  body: m.body,
                  at: new Date(m.created_at).getTime(),
                  recipientProfileId: m.recipient_profile_id ?? null,
                  recipientNickname: recipientNick,
                },
              ];
            });
          }
        )
        .subscribe();
    }

    void bootChat();

    return () => {
      cancelled = true;
      if (chatChannel) supabase.removeChannel(chatChannel);
    };
  }, [me, mock, hydrate, chatBootToken]);

  /* Matchmaking RPC */
  useEffect(() => {
    if (!me || mock) return;
    if (!inEggZone || eggArcadeOpen) {
      setQueueHint(null);
      matchLock.current = false;
      if (matchIv.current) {
        clearInterval(matchIv.current);
        matchIv.current = null;
      }
      return;
    }
    setQueueHint("In queue for PvP… Press Q in the egg for solo climb.");
    if (matchIv.current) clearInterval(matchIv.current);
    matchIv.current = window.setInterval(async () => {
      if (matchLock.current) return;
      const supabase = createClient();
      const { data, error } = await supabase.rpc("ovum_try_start_race", {
        p_room: LOBBY_ROOM_SLUG,
      });
      if (error) return;
      const raceId = data as string | null;
      if (raceId) {
        matchLock.current = true;
        if (matchIv.current) {
          clearInterval(matchIv.current);
          matchIv.current = null;
        }
        setCountdown(3);
        let c = 3;
        const cd = window.setInterval(() => {
          c -= 1;
          setCountdown(c);
          if (c <= 0) {
            clearInterval(cd);
            setCountdown(null);
            router.push(`/race/${raceId}`);
          }
        }, 700);
      }
    }, 1600);
    return () => {
      if (matchIv.current) {
        clearInterval(matchIv.current);
        matchIv.current = null;
      }
    };
  }, [me, mock, inEggZone, eggArcadeOpen, router, setQueueHint]);

  useEffect(() => {
    const onSolo = (e: KeyboardEvent) => {
      if (e.code !== "KeyQ" || e.repeat) return;
      if (chatFocusedRef.current) return;
      if (!me || eggArcadeOpen) return;
      if (!inEggZone) return;
      if (countdown != null) return;
      if (selectedProfileId || reportOpen) return;
      e.preventDefault();
      setEggArcadeOpen(true);
    };
    window.addEventListener("keydown", onSolo);
    return () => window.removeEventListener("keydown", onSolo);
  }, [me, inEggZone, eggArcadeOpen, countdown, selectedProfileId, reportOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      keys.current[e.code] = e.type === "keydown";
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  useEffect(() => {
    const blockScroll = (e: KeyboardEvent) => {
      if (chatFocusedRef.current) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", blockScroll, { capture: true });
    return () => window.removeEventListener("keydown", blockScroll, { capture: true });
  }, []);

  useEffect(() => {
    const onDoc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (eggArcadeOpen) return;
      if (selectedProfileId) return;
      const t = e.target;
      if (t instanceof HTMLInputElement && t.dataset.lobbyChat === "1") return;
      if (t instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      router.push("/onboarding");
    };
    document.addEventListener("keydown", onDoc);
    return () => document.removeEventListener("keydown", onDoc);
  }, [router, selectedProfileId, eggArcadeOpen]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (me && !mock) {
        othersPositionsRef.current = swimmersRef.current
          .filter((s) => s.profileId !== me.id)
          .map((s) => ({ x: s.x, y: s.y }));
      }
      const sp = 0.006;
      const move = !chatFocusedRef.current && !eggArcadeOpenRef.current;
      if (move && (keys.current["KeyW"] || keys.current["ArrowUp"])) posRef.current.y -= sp;
      if (move && (keys.current["KeyS"] || keys.current["ArrowDown"])) posRef.current.y += sp;
      if (move && (keys.current["KeyA"] || keys.current["ArrowLeft"])) posRef.current.x -= sp;
      if (move && (keys.current["KeyD"] || keys.current["ArrowRight"])) posRef.current.x += sp;
      clampLobbyPosition(posRef.current);
      applyEggCoreRepulsion(posRef.current);
      applySwimmerRepulsion(posRef.current, othersPositionsRef.current);
      clampLobbyPosition(posRef.current);
      if (me) {
        const z = isInEggZone(posRef.current.x, posRef.current.y);
        if (prevEggZoneRef.current !== z) {
          prevEggZoneRef.current = z;
          setInEggZone(z);
        }
      }
      syncLocalAvatarDom();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [me, mock, setInEggZone, syncLocalAvatarDom]);

  async function sendChat() {
    if (!me) return;
    const now = Date.now();
    if (now - lastChat.current < CHAT_RATE_MS) return;
    const raw = chatInput.trim();
    if (!raw) return;

    const cmd = parseChatCommand(raw);
    let body = "";
    let recipientId: string | null = null;
    let recipientNick: string | null = null;

    if (cmd.kind === "whisper") {
      body = sanitizePublicText(cmd.text, MAX_CHAT_LEN);
      const target = buildDisplaySwimmers(swimmersRef.current, me, mock, posRef).find(
        (s) => s.nickname.toLowerCase() === cmd.targetNick.toLowerCase()
      );
      if (!target) {
        setMessages((m) => [
          ...m,
          {
            id: `sys-${now}`,
            profileId: "system",
            nickname: "System",
            body: `Player "${cmd.targetNick}" not found.`,
            at: now,
            recipientProfileId: null,
            recipientNickname: null,
          },
        ]);
        return;
      }
      recipientId = target.profileId;
      recipientNick = target.nickname;
    } else {
      body = sanitizePublicText(cmd.text, MAX_CHAT_LEN);
      if (whisperTo) {
        recipientId = whisperTo.id;
        recipientNick = whisperTo.nick;
      }
    }

    if (!body) return;
    lastChat.current = now;
    setChatInput("");
    if (mock) {
      setMessages((m) => [
        ...m,
        {
          id: `local-${now}`,
          profileId: me.id,
          nickname: me.nickname,
          body,
          at: now,
          recipientProfileId: recipientId,
          recipientNickname: recipientNick,
        },
      ]);
      return;
    }
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body,
        recipientProfileId: recipientId,
      }),
    });
    const json = (await res.json().catch(() => null)) as
      | {
          ok?: boolean;
          message?: {
            id: string;
            body: string;
            created_at: string;
            recipient_profile_id?: string | null;
          };
        }
      | { error?: string }
      | null;
    if (!res.ok || !json || !("ok" in json) || !json.ok || !json.message) {
      return;
    }
    const d = json.message;
    setMessages((prev) => {
      if (prev.some((x) => x.id === d.id)) return prev;
      return [
        ...prev,
        {
          id: d.id,
          profileId: me.id,
          nickname: me.nickname,
          body: d.body,
          at: new Date(d.created_at).getTime(),
          recipientProfileId: d.recipient_profile_id ?? null,
          recipientNickname: recipientNick,
        },
      ];
    });
  }

  const selected = useMemo(
    () =>
      buildDisplaySwimmers(swimmers, me, mock, posRef).find((s) => s.profileId === selectedProfileId) ??
      null,
    [swimmers, me, mock, selectedProfileId]
  );

  useEffect(() => {
    if (!selectedProfileId || !me) {
      setPeekCard(null);
      setPeekStatus("idle");
      return;
    }
    if (mock) {
      // swimmers меняется каждый тик позиций — не включать в deps, иначе бесконечный loading/ready.
      const s = swimmersRef.current.find((x) => x.profileId === selectedProfileId);
      if (!s) {
        setPeekCard(null);
        setPeekStatus("error");
        return;
      }
      setPeekCard(swimmerToProfilePeekCard(s));
      setPeekStatus("ready");
      return;
    }
    if (selectedProfileId === me.id) {
      setPeekCard(storedToCard(me));
      setPeekStatus("ready");
      return;
    }
    let cancelled = false;
    setPeekStatus("loading");
    setPeekCard(null);
    void (async () => {
      const data = await fetchProfileCardDataForLobby(selectedProfileId);
      if (cancelled) return;
      if (!data) {
        setPeekStatus("error");
        return;
      }
      setPeekCard(data);
      setPeekStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProfileId, me, mock]);

  async function submitReport() {
    if (!reportTarget) return;
    await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetProfileId: reportTarget.id,
        reason: sanitizePublicText(reportReason, 500),
      }),
    });
    setReportOpen(false);
    setReportReason("");
  }

  const visibleMessages = useMemo(() => {
    if (!me) return [];
    return messages.filter(
      (m) =>
        m.profileId === "system" ||
        !m.recipientProfileId ||
        m.profileId === me.id ||
        m.recipientProfileId === me.id
    );
  }, [messages, me]);

  function chatViewportNearBottom(el: HTMLDivElement) {
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }

  useLayoutEffect(() => {
    if (chatCollapsed) return;
    const el = chatScrollViewportRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatCollapsed]);

  useLayoutEffect(() => {
    if (chatCollapsed) return;
    const el = chatScrollViewportRef.current;
    if (!el) return;
    const len = visibleMessages.length;
    if (len > chatScrollPrevLenRef.current) {
      if (chatScrollPrevLenRef.current === 0 || chatViewportNearBottom(el)) {
        el.scrollTop = el.scrollHeight;
      }
    }
    chatScrollPrevLenRef.current = len;
  }, [visibleMessages, chatCollapsed]);

  const whisperRecipients = useMemo(() => {
    if (!me) return [];
    return buildDisplaySwimmers(swimmers, me, mock, posRef).filter((s) => s.profileId !== me.id);
  }, [swimmers, me, mock]);

  const whisperSuggestState = useMemo(() => parseWhisperAutocompleteState(chatInput), [chatInput]);

  const whisperSuggestions = useMemo(() => {
    if (!whisperSuggestState || !me) return [];
    const q = whisperSuggestState.query.toLowerCase();
    const base = whisperRecipients;
    if (!q) return base.slice(0, 8);
    const low = (n: string) => n.toLowerCase();
    const pref = base.filter((s) => low(s.nickname).startsWith(q));
    const prefIds = new Set(pref.map((s) => s.profileId));
    const rest = base.filter((s) => !prefIds.has(s.profileId) && low(s.nickname).includes(q));
    return [...pref, ...rest].slice(0, 8);
  }, [whisperSuggestState, whisperRecipients, me]);

  useEffect(() => {
    setWhisperSuggestHi(0);
  }, [whisperSuggestions]);

  const applyWhisperPick = useCallback((nickname: string) => {
    setChatInput(`/w ${nickname} `);
  }, []);

  if (!me) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        Loading lobby…
      </div>
    );
  }

  return (
    <div
      className={cn("flex h-dvh flex-col overflow-hidden pt-safe pb-safe font-sans text-zinc-100")}
      style={{ backgroundColor: REF.bg }}
    >
      <div className="relative z-10 flex min-h-0 flex-1 p-2 px-[max(0.5rem,env(safe-area-inset-left,0px))] pr-[max(0.5rem,env(safe-area-inset-right,0px))] md:pb-0">
        <div
          ref={playfieldSurfaceRef}
          className="relative min-h-[200px] flex-1 touch-manipulation overflow-hidden rounded-lg border border-border bg-background shadow-[inset_0_0_80px_rgba(0,0,0,0.5)]"
          style={{ backgroundColor: REF.bg }}
          onPointerDown={onPlayfieldPointerDown}
          onPointerMove={onPlayfieldPointerMove}
          onPointerUp={onPlayfieldPointerEnd}
          onPointerCancel={onPlayfieldPointerEnd}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") onPlayfieldPointerEnd(e);
          }}
        >
          <LobbyAudioBridge />
          <div
            data-lobby-chrome
            className="absolute right-[max(0.5rem,env(safe-area-inset-right,0px))] top-[max(0.5rem,env(safe-area-inset-top,0px))] z-[25] flex max-w-[100vw] flex-wrap justify-end gap-2"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              size="sm"
              variant={lobbyMusicOn ? "secondary" : "outline"}
              className="min-h-11 h-auto gap-1 border-border bg-muted/50 px-3 py-2 text-[10px] md:min-h-0 md:py-1.5 font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-pressed={lobbyMusicOn}
              aria-label={
                lobbyMusicOn
                  ? "Выключить фоновый ритм лобби"
                  : "Включить фоновый ритм лобби (клик — разблокирует звук в браузере)"
              }
              onClick={() => {
                const next = !lobbyMusicOn;
                setLobbyMusicOn(next);
                try {
                  sessionStorage.setItem("ovum_lobby_music", next ? "1" : "0");
                } catch {
                  /* ignore */
                }
              }}
            >
              {lobbyMusicOn ? (
                <Volume2 className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              ) : (
                <VolumeX className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              )}
              Beat
            </Button>
            <Link
              href="/leaderboard"
              className="inline-flex min-h-11 min-w-[44px] items-center justify-center rounded-md border border-border bg-muted/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:min-h-0 md:py-1.5"
            >
              Leaderboard
            </Link>
          </div>

          <div
            data-lobby-chrome
            className="absolute bottom-[max(0.5rem,env(safe-area-inset-bottom,0px))] left-[max(0.5rem,env(safe-area-inset-left,0px))] z-30 w-[min(calc(100%-1rem),304px)] max-w-[calc(100%-1.25rem)] touch-manipulation"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
          >
            <AnimatePresence mode="wait" initial={false}>
              {chatCollapsed ? (
                <motion.button
                  key="chat-collapsed"
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left shadow-sm"
                  onClick={() => setChatCollapsed(false)}
                >
                  <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-foreground">
                    <MessageSquare className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                    Chat
                  </span>
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </motion.button>
              ) : (
                <motion.div
                  key="chat-open"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                  className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm"
                >
                  <div className="relative z-[1] flex items-center justify-between gap-2 border-b border-border px-2 py-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                      Chat
                    </span>
                    <div className="flex items-center gap-0.5">
                      {whisperTo ? (
                        <button
                          type="button"
                          className="mr-1 max-w-[100px] truncate rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[9px] font-medium text-foreground hover:bg-muted"
                          onClick={() => setWhisperTo(null)}
                        >
                          → {whisperTo.nick} ✕
                        </button>
                      ) : null}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-muted-foreground"
                        aria-label="Minimize chat"
                        onClick={() => setChatCollapsed(true)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-muted-foreground"
                        aria-label="Close chat"
                        onClick={() => setChatCollapsed(true)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="relative z-[1] border-b border-border px-2 py-1 text-[9px] leading-snug text-muted-foreground">
                    <span className="font-mono text-foreground">/w</span> then pick a name ·{" "}
                    <span className="font-mono text-foreground">/w Name message</span> ·{" "}
                    <span className="font-mono text-foreground">Esc</span> wardrobe · whisper to you = short ping · WASD
                    when chat unfocused · in the egg: <span className="font-mono text-foreground">Q</span> solo climb
                  </p>
                  <ScrollArea
                    className="relative z-[1] h-[min(28vh,200px)] p-2"
                    thumbClassName="rounded-full bg-neutral-600/60 hover:bg-neutral-500/70"
                    scrollbarClassName="w-1 border-l-0 p-px"
                    viewportRef={chatScrollViewportRef}
                  >
                    <div className="flex flex-col gap-2 pr-1 font-sans text-[11px] leading-snug">
                      {!mock &&
                      (chatHistoryStatus === "idle" || chatHistoryStatus === "loading") ? (
                        <p className="py-2 text-center text-[10px] text-zinc-500">Загрузка чата…</p>
                      ) : chatHistoryStatus === "error" ? (
                        <div className="flex flex-col items-center gap-2 py-2 text-center text-[10px] text-red-300">
                          <p>{chatHistoryError ?? "Не удалось загрузить историю"}</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setChatBootToken((t) => t + 1)}
                          >
                            Повторить
                          </Button>
                        </div>
                      ) : null}
                      {chatHistoryStatus === "ready" || mock
                        ? visibleMessages.map((m) => {
                        const isMine = m.profileId === me.id && m.profileId !== "system";
                        const incoming =
                          m.recipientProfileId === me.id &&
                          m.profileId !== me.id &&
                          m.profileId !== "system";
                        const isSys = m.profileId === "system";
                        const isWhisper = Boolean(m.recipientProfileId);
                        if (isSys) {
                          return (
                            <div
                              key={m.id}
                              className="mx-auto max-w-[95%] rounded-md border border-zinc-700/80 bg-zinc-900/80 px-2 py-1 text-center text-zinc-500"
                            >
                              {m.body}
                            </div>
                          );
                        }
                        return (
                          <div
                            key={m.id}
                            className={cn(
                              "max-w-[92%] rounded-md border px-2.5 py-1.5",
                              isWhisper
                                ? isMine
                                  ? "ml-auto border-purple-500/45 bg-purple-950/55 text-foreground shadow-[0_0_20px_rgba(168,85,247,0.12)]"
                                  : "mr-auto border-purple-500/45 bg-purple-950/55 text-foreground shadow-[0_0_20px_rgba(168,85,247,0.12)]"
                                : isMine
                                  ? "ml-auto border-border bg-muted/60 text-foreground"
                                  : "mr-auto border-border bg-card text-foreground"
                            )}
                          >
                            <div
                              className={cn(
                                "mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground",
                                isMine && !isWhisper && "text-foreground/80",
                                isWhisper && "text-purple-200/90"
                              )}
                            >
                              {m.nickname}
                              {m.recipientProfileId ? (
                                <span className="ml-1 font-normal normal-case text-purple-300/80">
                                  {incoming ? "(whisper)" : "(to " + (m.recipientNickname ?? "?") + ")"}
                                </span>
                              ) : null}
                            </div>
                            <div
                              className={cn(
                                incoming && !isWhisper && "text-foreground/90",
                                isWhisper && "text-purple-50/95"
                              )}
                            >
                              {m.body}
                            </div>
                          </div>
                        );
                      })
                        : null}
                      {(chatHistoryStatus === "ready" || mock) && visibleMessages.length === 0 ? (
                        <p className="py-2 text-center text-[10px] text-zinc-500">Пока нет сообщений.</p>
                      ) : null}
                    </div>
                  </ScrollArea>
                  <div className="relative z-[1] flex gap-1.5 border-t border-border p-2">
                    <div className="relative min-w-0 flex-1">
                      {whisperSuggestState ? (
                        <div
                          className="absolute bottom-full left-0 right-0 z-20 mb-1 max-h-[min(40vh,220px)] overflow-auto rounded-md border border-border bg-card py-1 shadow-lg"
                          role="listbox"
                          aria-label="Whisper to player"
                        >
                          {whisperSuggestions.length === 0 ? (
                            <p className="px-2 py-2 text-[10px] text-muted-foreground">
                              No one in the lobby matches. Check spelling or wait for them to join.
                            </p>
                          ) : (
                            whisperSuggestions.map((s, idx) => (
                              <button
                                key={s.profileId}
                                type="button"
                                role="option"
                                aria-selected={idx === whisperSuggestHi}
                                className={cn(
                                  "flex min-h-11 w-full items-center px-2 py-2 text-left text-[11px] font-medium text-foreground md:min-h-9 md:py-1.5",
                                  idx === whisperSuggestHi ? "bg-muted" : "hover:bg-muted/70"
                                )}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => applyWhisperPick(s.nickname)}
                              >
                                {s.nickname}
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                      <Input
                        data-lobby-chat="1"
                        value={chatInput}
                        maxLength={MAX_CHAT_LEN}
                        placeholder={
                          whisperTo ? `To ${whisperTo.nick}…` : "Type a message…"
                        }
                        onChange={(e) => setChatInput(e.target.value)}
                        onFocus={() => {
                          chatFocusedRef.current = true;
                        }}
                        onBlur={() => {
                          chatFocusedRef.current = false;
                        }}
                        onKeyDown={(e) => {
                          const open = whisperSuggestState !== null;
                          const list = whisperSuggestions;
                          if (e.key === "ArrowDown" && open && list.length > 0) {
                            e.preventDefault();
                            setWhisperSuggestHi((i) => Math.min(i + 1, list.length - 1));
                            return;
                          }
                          if (e.key === "ArrowUp" && open && list.length > 0) {
                            e.preventDefault();
                            setWhisperSuggestHi((i) => Math.max(i - 1, 0));
                            return;
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            e.stopPropagation();
                            if (open) {
                              setChatInput("");
                              return;
                            }
                            router.push("/onboarding");
                            return;
                          }
                          if (e.key === "Enter") {
                            if (open && list.length > 0) {
                              e.preventDefault();
                              const pick = list[Math.min(whisperSuggestHi, list.length - 1)];
                              if (pick) applyWhisperPick(pick.nickname);
                              return;
                            }
                            void sendChat();
                          }
                        }}
                        className="h-11 w-full pr-9 text-base md:h-8 md:text-[11px]"
                      />
                      <Sparkles
                        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground opacity-50"
                        aria-hidden
                      />
                    </div>
                    <Button type="button" size="sm" className="h-11 min-w-[44px] shrink-0 px-4 text-sm md:h-8 md:px-3 md:text-xs" onClick={sendChat}>
                      Send
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <LobbyEggZone online={online} visualPulse={visualRhythm} />

          <AnimatePresence>
            {countdown !== null && countdown > 0 ? (
              <motion.div
                key={countdown}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1.05, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center font-display text-7xl font-black text-white"
              >
                {countdown}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <LobbyPlayfieldAvatars
            swimmers={swimmers}
            me={me}
            posRef={posRef}
            visualRhythm={visualRhythm}
            inEggZone={inEggZone}
            setSelectedProfileId={setSelectedProfileId}
            swimmerPrevPosRef={swimmerPrevPosRef}
            swimmerFacingRef={swimmerFacingRef}
            localAvatarButtonRef={localAvatarButtonRef}
            localAvatarAnimFlushRef={localAvatarAnimFlushRef}
          />
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={() => setSelectedProfileId(null)}>
        <DialogContent className="max-h-[min(90dvh,640px)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {peekCard?.nickname ?? selected?.nickname ?? "Player profile"}
            </DialogTitle>
          </DialogHeader>
          {peekStatus === "loading" ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading profile…</p>
          ) : null}
          {peekStatus === "ready" && peekCard ? (
            <PlayerCard data={peekCard} exportId={`lobby-peek-${selectedProfileId ?? "x"}`} />
          ) : null}
          {peekStatus === "error" && selected ? (
            <div className="space-y-2 rounded-lg border border-border bg-card/50 p-3">
              <p className="text-xs text-muted-foreground">Couldn&apos;t load full profile from server.</p>
              <div className="flex justify-center">
                <SwimmerAvatar
                  colorTheme={selected.loadout.colorTheme}
                  tailType={selected.loadout.tailType}
                  auraEffect={selected.loadout.auraEffect}
                  headgear={selected.loadout.headgear}
                  faceExtra={selected.loadout.faceExtra}
                  neckWear={selected.loadout.neckWear}
                  size="lg"
                />
              </div>
              <p className="text-center text-sm font-semibold">{selected.nickname}</p>
            </div>
          ) : null}
          {selected && peekStatus !== "loading" ? (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              {selected.profileId !== me.id ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setWhisperTo({ id: selected.profileId, nick: selected.nickname });
                    setSelectedProfileId(null);
                  }}
                >
                  Whisper
                </Button>
              ) : null}
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => {
                  setReportTarget({ id: selected.profileId, nick: selected.nickname });
                  setReportOpen(true);
                }}
              >
                Report
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report: {reportTarget?.nick}</DialogTitle>
          </DialogHeader>
          <Input
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Reason"
          />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitReport}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {inEggZone && me && !eggArcadeOpen ? (
        <div className="pointer-events-none fixed bottom-[max(5.5rem,env(safe-area-inset-bottom,0px)+4.5rem)] left-1/2 z-[60] max-w-[min(92vw,320px)] -translate-x-1/2 rounded-full border border-cyan-500/35 bg-zinc-950/90 px-3 py-1.5 text-center text-[10px] font-medium leading-snug text-cyan-100/95 shadow-lg backdrop-blur-sm">
          Press <kbd className="mx-0.5 rounded border border-white/20 bg-white/10 px-1.5 py-px font-mono">Q</kbd> for
          solo egg climb
        </div>
      ) : null}

      {eggArcadeOpen ? (
        <div
          className="fixed inset-0 z-[100] flex min-h-0 flex-col overflow-x-hidden overflow-y-auto bg-background pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
          role="dialog"
          aria-modal="true"
          aria-label="Solo egg climb"
        >
          <VerticalRushClient variant="embed" onExit={() => setEggArcadeOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
