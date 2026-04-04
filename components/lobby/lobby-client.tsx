"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronUp, MessageSquare, Minus, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/mock-mode";
import { LOBBY_ROOM_SLUG } from "@/lib/constants";
import { isInEggZone } from "@/lib/egg-zone";
import { loadLocalProfile, type StoredProfile } from "@/lib/local-profile";
import { useLobbyStore } from "@/store/lobby-store";
import { useLobbyRhythmStore } from "@/store/lobby-rhythm-store";
import { LobbyAudioBridge } from "@/components/lobby/lobby-audio-bridge";
import { LobbyEggZone } from "@/components/lobby/lobby-egg-zone";
import { RhythmPulseWrap } from "@/components/lobby/rhythm-pulse-wrap";
import { SwimmerAvatar } from "@/components/avatar/swimmer-avatar";
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
import { ALL_TAIL_TYPES, type AvatarLoadout, type ColorTheme, type TailType, type AuraType } from "@/types";
import { cosmeticsForSeed, parseFaceExtraId, parseHeadgearId, parseNeckWearId } from "@/lib/loadout-cosmetics";
import { CHAT_RATE_MS, MAX_CHAT_LEN } from "@/lib/constants";
import { sanitizePublicText } from "@/lib/sanitize";
import { parseChatCommand } from "@/lib/chat-parse";
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

type LobbyPlayfieldAvatarsProps = {
  swimmers: Swimmer[];
  me: StoredProfile;
  mock: boolean;
  posRef: MutableRefObject<{ x: number; y: number }>;
  accentGeneration: number;
  visualRhythm: boolean;
  setSelectedProfileId: (id: string | null) => void;
  swimmerPrevPosRef: MutableRefObject<Map<string, { x: number; y: number }>>;
  swimmerFacingRef: MutableRefObject<Map<string, number>>;
  playfieldRafFlushRef: MutableRefObject<(() => void) | null>;
};

/** Только этот слой перерисовывается каждый кадр движения — чат и остальной UI не участвуют в 60fps. */
function LobbyPlayfieldAvatars(props: LobbyPlayfieldAvatarsProps) {
  const {
    swimmers,
    me,
    mock,
    posRef,
    accentGeneration,
    visualRhythm,
    setSelectedProfileId,
    swimmerPrevPosRef,
    swimmerFacingRef,
    playfieldRafFlushRef,
  } = props;
  const [rafTick, setRafTick] = useState(0);

  useLayoutEffect(() => {
    const flush = () => setRafTick((t) => t + 1);
    playfieldRafFlushRef.current = flush;
    return () => {
      playfieldRafFlushRef.current = null;
    };
  }, [playfieldRafFlushRef]);

  const displaySwimmers = useMemo(
    () => buildDisplaySwimmers(swimmers, me, mock, posRef),
    // rafTick подтягивает чтение posRef; сам ref стабилен
    // eslint-disable-next-line react-hooks/exhaustive-deps -- posRef стабилен
    [swimmers, me, mock, rafTick]
  );

  return (
    <>
      {displaySwimmers.map((s) => {
        const { facingDeg, moving } = lobbySwimmerMotion(
          swimmerPrevPosRef,
          swimmerFacingRef,
          s.profileId,
          s.x,
          s.y
        );
        return (
          <button
            key={s.profileId}
            type="button"
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 bg-transparent p-0 will-change-transform"
            style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}
            onClick={() => setSelectedProfileId(s.profileId)}
          >
            <RhythmPulseWrap accentGeneration={accentGeneration} enabled={visualRhythm}>
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
      })}
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
  const [chatInput, setChatInput] = useState("");
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
  const [reportTarget, setReportTarget] = useState<{ id: string; nick: string } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [chatCollapsed, setChatCollapsed] = useState(false);
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
  const playfieldRafFlushRef = useRef<(() => void) | null>(null);
  const prevEggZoneRef = useRef<boolean | null>(null);
  const presenceUserIdRef = useRef<string | null>(null);

  const accentGeneration = useLobbyRhythmStore((s) => s.accentGeneration);
  const lobbyMusicOn = useLobbyRhythmStore((s) => s.lobbyMusicOn);
  const setLobbyMusicOn = useLobbyRhythmStore((s) => s.setLobbyMusicOn);
  const reduceMotion = useReducedMotion();
  const visualRhythm = Boolean(lobbyMusicOn && !reduceMotion);

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
    const ids = uniqueRows.map((r) => r.profile_id);
    const map = await hydrate(ids);
    setSwimmers(
      uniqueRows.map((r) => ({
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
          const map = await hydrate([row.profile_id]);
          const meta = map.get(row.profile_id);
          if (!meta) return;
          setSwimmers((prev) => {
            const others = prev.filter((sw) => sw.profileId !== row.profile_id);
            return [
              ...others,
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
      const z = isInEggZone(posRef.current.x, posRef.current.y);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      presenceUserIdRef.current = u.user.id;
      await supabase.from("presence_rooms").upsert(
        {
          room_slug: LOBBY_ROOM_SLUG,
          profile_id: u.user.id,
          pos_x: posRef.current.x,
          pos_y: posRef.current.y,
          in_queue: z,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "room_slug,profile_id" }
      );
    }, 220);

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

  /* Chat realtime */
  useEffect(() => {
    if (!me || mock) return;
    const supabase = createClient();
    const ch = supabase
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
          const ids = [m.profile_id];
          if (m.recipient_profile_id) ids.push(m.recipient_profile_id);
          const map = await hydrate(ids);
          const nick = map.get(m.profile_id)?.nick ?? "???";
          const recipientNick = m.recipient_profile_id
            ? map.get(m.recipient_profile_id)?.nick ?? "???"
            : null;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
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
    return () => {
      supabase.removeChannel(ch);
    };
  }, [me, mock, hydrate]);

  /* Matchmaking RPC */
  useEffect(() => {
    if (!me || mock) return;
    if (!inEggZone) {
      setQueueHint(null);
      matchLock.current = false;
      if (matchIv.current) {
        clearInterval(matchIv.current);
        matchIv.current = null;
      }
      return;
    }
    setQueueHint("In queue… need another swimmer in the zone.");
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
  }, [me, mock, inEggZone, router, setQueueHint]);

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
    let raf = 0;
    const loop = () => {
      if (me && !mock) {
        othersPositionsRef.current = swimmersRef.current
          .filter((s) => s.profileId !== me.id)
          .map((s) => ({ x: s.x, y: s.y }));
      }
      const sp = 0.006;
      const move = !chatFocusedRef.current;
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
      playfieldRafFlushRef.current?.();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [me, mock, setInEggZone]);

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

  if (!me) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        Loading lobby…
      </div>
    );
  }

  return (
    <div
      className={cn("flex h-dvh flex-col overflow-hidden font-sans text-zinc-100")}
      style={{ backgroundColor: REF.bg }}
    >
      <div className="relative z-10 flex min-h-0 flex-1 p-2 md:pb-0">
        <div
          className="relative min-h-[200px] flex-1 touch-none overflow-hidden rounded-lg border border-border bg-background shadow-[inset_0_0_80px_rgba(0,0,0,0.5)]"
          style={{ backgroundColor: REF.bg }}
        >
          <LobbyAudioBridge />
          <div
            className="absolute right-2 top-2 z-[25] flex flex-wrap justify-end gap-2"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              size="sm"
              variant={lobbyMusicOn ? "secondary" : "outline"}
              className="h-auto gap-1 border-border bg-muted/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-foreground"
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
              className="rounded-md border border-border bg-muted/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Leaderboard
            </Link>
            <Link
              href="/onboarding"
              className="rounded-md border border-border bg-muted/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Settings
            </Link>
          </div>

          <div
            className="absolute bottom-2 left-2 z-30 w-[min(calc(100%-1rem),304px)] max-w-[calc(100%-1rem)] touch-manipulation"
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
                    <span className="font-mono text-foreground">/w Name</span> whisper · WASD when chat
                    unfocused
                  </p>
                  <ScrollArea
                    className="relative z-[1] h-[min(28vh,200px)] p-2"
                    thumbClassName="rounded-full bg-neutral-600/60 hover:bg-neutral-500/70"
                    scrollbarClassName="w-1 border-l-0 p-px"
                  >
                    <div className="flex flex-col gap-2 pr-1 font-sans text-[11px] leading-snug">
                      {visibleMessages.map((m) => {
                        const isMine = m.profileId === me.id && m.profileId !== "system";
                        const incoming =
                          m.recipientProfileId === me.id &&
                          m.profileId !== me.id &&
                          m.profileId !== "system";
                        const isSys = m.profileId === "system";
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
                              isMine
                                ? "ml-auto border-border bg-muted/60 text-foreground"
                                : "mr-auto border-border bg-card text-foreground"
                            )}
                          >
                            <div
                              className={cn(
                                "mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground",
                                isMine && "text-foreground/80"
                              )}
                            >
                              {m.nickname}
                              {m.recipientProfileId ? (
                                <span className="ml-1 font-normal normal-case text-muted-foreground">
                                  {incoming ? "(whisper)" : "(to " + (m.recipientNickname ?? "?") + ")"}
                                </span>
                              ) : null}
                            </div>
                            <div className={incoming ? "text-foreground/90" : ""}>{m.body}</div>
                          </div>
                        );
                      })}
                      {visibleMessages.length === 0 ? (
                        <p className="py-2 text-center text-[10px] text-zinc-500">No messages yet.</p>
                      ) : null}
                    </div>
                  </ScrollArea>
                  <div className="relative z-[1] flex gap-1.5 border-t border-border p-2">
                    <div className="relative min-w-0 flex-1">
                      <Input
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
                        onKeyDown={(e) => e.key === "Enter" && sendChat()}
                        className="h-8 w-full pr-9 text-[11px]"
                      />
                      <Sparkles
                        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground opacity-50"
                        aria-hidden
                      />
                    </div>
                    <Button type="button" size="sm" className="h-8 shrink-0 px-3 text-xs" onClick={sendChat}>
                      Send
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <LobbyEggZone
            online={online}
            accentGeneration={accentGeneration}
            visualPulse={visualRhythm}
          />

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
            mock={mock}
            posRef={posRef}
            accentGeneration={accentGeneration}
            visualRhythm={visualRhythm}
            setSelectedProfileId={setSelectedProfileId}
            swimmerPrevPosRef={swimmerPrevPosRef}
            swimmerFacingRef={swimmerFacingRef}
            playfieldRafFlushRef={playfieldRafFlushRef}
          />
        </div>
      </div>

      <div
        className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-background px-3 py-2 md:px-4"
        style={{ backgroundColor: REF.bg }}
      >
        <Button variant="secondary" size="sm" asChild>
          <Link href="/onboarding">Wardrobe</Link>
        </Button>
        <div className="flex flex-1 flex-wrap justify-center gap-2">
          <Badge variant="outline" className="text-muted-foreground shadow-none">
            {inEggZone ? "In zone" : "Outside"}
          </Badge>
          <Badge variant="outline" className="text-muted-foreground shadow-none">
            {mock ? "Mock" : "Live"}
          </Badge>
          {mock ? (
            <Button size="sm" variant="secondary" asChild>
              <Link href="/race/demo">Demo race</Link>
            </Button>
          ) : null}
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link href="/community-rules">Rules</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/">Exit</Link>
        </Button>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={() => setSelectedProfileId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.nickname}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3">
              <SwimmerAvatar
                colorTheme={selected.loadout.colorTheme}
                tailType={selected.loadout.tailType}
                auraEffect={selected.loadout.auraEffect}
                headgear={selected.loadout.headgear}
                faceExtra={selected.loadout.faceExtra}
                neckWear={selected.loadout.neckWear}
                size="lg"
              />
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
    </div>
  );
}
