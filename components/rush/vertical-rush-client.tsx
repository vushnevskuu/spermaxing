"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/mock-mode";
import { SwimmerAvatar } from "@/components/avatar/swimmer-avatar";
import { Button } from "@/components/ui/button";
import { BAD_ITEMS, GOOD_ITEMS, OBSTACLES, type BadId, type GoodId, type ObstacleId } from "@/lib/vertical-rush-catalog";
import { createEmptyRushEquipped } from "@/lib/vertical-rush-equipped";
import { loadLocalProfile, type StoredProfile } from "@/lib/local-profile";
import {
  drawCitrusCometTrail,
  drawPickupOrObstacle,
  drawPlayerGroundGlow,
  drawProjectile,
  drawRivalEgg,
  drawRivalSwimmer,
  drawVerticalRushBackground,
} from "@/lib/vertical-rush-render";

const LANES = 3;
/** World units along track per pixel of vertical screen offset (see screenY formula). */
const TRACK_SCALE = 0.92;
/** Pickups align with SwimmerAvatar head above body center (px). */
const HEAD_OFFSET_PX = 26;
const HEAD_WORLD = HEAD_OFFSET_PX / TRACK_SCALE;
const COLL_HEAD = 15;
const COLL_BODY = 38;
const LANE_HEAD = 0.36;
const LANE_BODY = 0.42;
const RIVAL_DESCENT = 158;
const BASE_SPEED = 195;
const METERS_SCALE = 1 / 12;
/** Импульс (0…paceMax): и «жизнь», и доля скорости; постоянно тлеет. */
const PACE_START = 100;
const PACE_DECAY_PER_SEC = 3.1;
const PACE_DEATH_BELOW = 0.75;
const RIVAL_PACE_HIT = 12;
const EGG_PACE_HIT = 17;
const STRIDE_MULT_MIN = 0.48;
const STRIDE_MULT_MAX = 1.95;
const MAX_SWEET_STACK = 12;
const MAX_ZINC_STACK = 5;
const MAX_GARLIC_STACK = 5;
const CITRUS_FRENZY_MS = 2000;

function pickGoodSpawnId(g: { zincCount: number; garlicCount: number; rand: () => number }): GoodId {
  type Row = { id: GoodId; w: number };
  const rows: Row[] = [
    { id: "zinc", w: g.zincCount >= MAX_ZINC_STACK ? 0 : 0.28 },
    { id: "omega", w: 0.24 },
    { id: "garlic", w: g.garlicCount >= MAX_GARLIC_STACK ? 0 : 0.07 },
    { id: "onion_ring", w: 0.21 },
    { id: "citrus", w: 0.24 },
  ];
  const total = rows.reduce((s, x) => s + x.w, 0);
  if (total <= 0) return "citrus";
  let r = g.rand() * total;
  for (const row of rows) {
    r -= row.w;
    if (r <= 0) return row.id;
  }
  return "citrus";
}

type Ent =
  | { at: number; lane: number; kind: "good"; id: GoodId; consumed: boolean }
  | { at: number; lane: number; kind: "bad"; id: BadId; consumed: boolean }
  | { at: number; lane: number; kind: "obs"; id: ObstacleId; consumed: boolean }
  | { at: number; lane: number; kind: "rival"; consumed: boolean; wobbleSeed: number; baseLane: number }
  | { at: number; lane: number; kind: "egg"; laneSpan: 1 | 2; consumed: boolean };

type Proj = { pos: number; lane: number };

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function laneCenterX(lane: number, W: number): number {
  return (lane + 0.5) * (W / LANES);
}

function layoutFromViewport(rw: number, rh: number) {
  if (rw <= 0 || rh <= 0) return { W: 360, H: 640, PLAYER_Y: 640 * 0.78 };
  const land = rw >= rh * 1.02;
  const W = land ? 640 : 360;
  const H = land ? 360 : 640;
  return { W, H, PLAYER_Y: H * 0.78 };
}

export type VerticalRushClientProps = {
  /** `embed` = opened from lobby (egg zone); no “rush” framing, Esc/Close returns. */
  variant?: "page" | "embed";
  onExit?: () => void;
};

export function VerticalRushClient({ variant = "page", onExit }: VerticalRushClientProps = {}) {
  const router = useRouter();
  const embed = variant === "embed";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const playerSlotRef = useRef<HTMLDivElement>(null);
  /** Логические W×H трека: портрет 360×640 или ландшафт 640×360 от ориентации окна. */
  const layoutRef = useRef(layoutFromViewport(360, 640));
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [phase, setPhase] = useState<"loading" | "countdown" | "ready" | "play" | "dead">("loading");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hud, setHud] = useState({
    m: 0,
    pace: PACE_START,
    paceMax: PACE_START,
    ammo: 0,
    canShoot: false,
    toast: "" as string,
    /** Надетые пикапы на аватаре (не путать с иконками на canvas-треке). */
    rushEquipped: createEmptyRushEquipped(),
    /** Сладкое (candy/soda/sugar): больше глаз + быстрее зрачки. */
    sweetStack: 0,
    onionShieldCharges: 0,
    omegaShieldCharges: 0,
    zincCount: 0,
    garlicCount: 0,
    citrusComet: false,
  });
  const [bestLocal, setBestLocal] = useState(0);
  const [savedCloud, setSavedCloud] = useState<string | null>(null);

  const game = useRef({
    scroll: 0,
    laneF: 1,
    pace: PACE_START,
    paceMax: PACE_START,
    /** Множитель скорости поверх доли импульса (омега, цинк, дебаффы). */
    strideMult: 1,
    armor: 0,
    canShoot: false,
    ammo: 0,
    slowUntil: 0,
    stunUntil: 0,
    entities: [] as Ent[],
    projectiles: [] as Proj[],
    nextSpawn: 80,
    rand: mulberry32(Date.now() % 1e9),
    toastUntil: 0,
    toastText: "",
    lastHud: 0,
    rushEquipped: createEmptyRushEquipped(),
    sweetStack: 0,
    onionShieldCharges: 0,
    omegaShieldCharges: 0,
    zincCount: 0,
    garlicCount: 0,
    citrusFrenzyUntil: 0,
  });

  useEffect(() => {
    const p = loadLocalProfile();
    if (!p) {
      router.replace("/enter");
      return;
    }
    setProfile(p);
    try {
      const v = localStorage.getItem("ovum_vertical_rush_best_m");
      if (v) setBestLocal(Math.max(0, parseInt(v, 10) || 0));
    } catch {
      /* ignore */
    }
    setPhase(embed ? "countdown" : "ready");
  }, [router, embed]);

  useEffect(() => {
    if (!embed || !onExit) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onExit();
    };
    document.addEventListener("keydown", onEsc, true);
    return () => document.removeEventListener("keydown", onEsc, true);
  }, [embed, onExit]);

  const pushToast = (g: typeof game.current, text: string) => {
    g.toastText = text;
    g.toastUntil = performance.now() + 2200;
  };

  const syncRushHud = (g: typeof game.current) => {
    const now = performance.now();
    setHud((h) => ({
      ...h,
      pace: Math.round(g.pace),
      paceMax: Math.round(g.paceMax),
      rushEquipped: { ...g.rushEquipped },
      sweetStack: g.sweetStack,
      onionShieldCharges: g.onionShieldCharges,
      omegaShieldCharges: g.omegaShieldCharges,
      zincCount: g.zincCount,
      garlicCount: g.garlicCount,
      citrusComet: now < g.citrusFrenzyUntil,
    }));
  };

  /**
   * Удар соперника / стена: щиты стакаются независимо. Если активны оба — случайно тратится заряд лука или омеги
   * (нет фиксированного порядка).
   */
  const tryAbsorbBump = (g: typeof game.current): boolean => {
    const o = g.onionShieldCharges > 0;
    const w = g.omegaShieldCharges > 0;
    if (!o && !w) return false;
    if (o && !w) {
      g.onionShieldCharges -= 1;
      pushToast(g, "Onion whiff blocked the hit!");
    } else if (!o && w) {
      g.omegaShieldCharges -= 1;
      pushToast(g, "Omega bubble soaked it!");
    } else {
      if (g.rand() < 0.5) {
        g.onionShieldCharges -= 1;
        pushToast(g, "Onion whiff blocked the hit!");
      } else {
        g.omegaShieldCharges -= 1;
        pushToast(g, "Omega bubble soaked it!");
      }
    }
    syncRushHud(g);
    return true;
  };

  const applyGood = (g: typeof game.current, id: GoodId) => {
    g.rushEquipped[id] = true;
    switch (id) {
      case "zinc":
        if (g.zincCount >= MAX_ZINC_STACK) {
          g.pace = Math.min(g.paceMax, g.pace + 6);
          pushToast(g, "Zinc faded (+impulse only)");
          break;
        }
        g.zincCount += 1;
        g.pace = Math.min(g.paceMax, g.pace + 18);
        g.strideMult = Math.min(STRIDE_MULT_MAX, g.strideMult * 1.085);
        pushToast(g, `Zinc ${g.zincCount}/${MAX_ZINC_STACK}: +impulse · stride`);
        break;
      case "omega":
        g.strideMult = Math.min(STRIDE_MULT_MAX, g.strideMult * 1.12);
        g.pace = Math.min(g.paceMax, g.pace + 12);
        g.omegaShieldCharges = 2;
        pushToast(g, "Omega: +stride · bubble ×2");
        break;
      case "garlic":
        if (g.garlicCount >= MAX_GARLIC_STACK) {
          g.pace = Math.min(g.paceMax, g.pace + 12);
          pushToast(g, "Garlic maxed — small pulse");
          break;
        }
        g.garlicCount += 1;
        g.paceMax += 10;
        g.pace = Math.min(g.paceMax, g.pace + 26);
        g.armor = Math.min(0.45, g.armor + 0.1);
        pushToast(g, `Garlic ${g.garlicCount}/${MAX_GARLIC_STACK}: +max pulse & heal`);
        break;
      case "onion_ring":
        g.paceMax += 12;
        g.pace = Math.min(g.paceMax, g.pace + 8);
        g.onionShieldCharges = 1;
        pushToast(g, "Onion ring: +max pulse · whiff ×1");
        break;
      case "citrus": {
        const t = performance.now();
        g.canShoot = true;
        g.ammo = Math.min(99, g.ammo + 6);
        g.citrusFrenzyUntil = t + CITRUS_FRENZY_MS;
        pushToast(g, "Citrus comet! 2s invincible · smash!");
        break;
      }
    }
    // Джанк раздувает глаза (sweetStack); каждый бафф слегка «сдувает» обратно.
    g.sweetStack = Math.max(0, g.sweetStack - 1);
    syncRushHud(g);
  };

  const applyBad = (g: typeof game.current, id: BadId) => {
    g.rushEquipped[id] = true;
    if (id === "candy" || id === "soda" || id === "sugar_cube") {
      g.sweetStack = Math.min(MAX_SWEET_STACK, g.sweetStack + 1);
    }
    switch (id) {
      case "chips":
        g.strideMult = Math.max(STRIDE_MULT_MIN, g.strideMult * 0.88);
        g.slowUntil = performance.now() + 3800;
        pushToast(g, "Chips: slowed");
        break;
      case "candy":
        g.strideMult = Math.max(STRIDE_MULT_MIN, g.strideMult * 0.9);
        g.pace = Math.max(0, g.pace - 6);
        pushToast(g, "Candy: sticky, −pulse");
        break;
      case "soda":
        g.pace = Math.max(0, g.pace - 10);
        g.slowUntil = performance.now() + 2800;
        pushToast(g, "Soda: bloated");
        break;
      case "fried_ring":
        g.strideMult = Math.max(STRIDE_MULT_MIN, g.strideMult * 0.82);
        pushToast(g, "Fried ring: greased");
        break;
      case "sugar_cube":
        g.pace = Math.max(0, g.pace - 14);
        g.stunUntil = performance.now() + 420;
        pushToast(g, "Sugar crash!");
        break;
    }
    syncRushHud(g);
  };

  const spawnEntity = (g: typeof game.current) => {
    const lane = Math.floor(g.rand() * LANES);
    const roll = g.rand();
    const at = g.scroll + 520 + g.rand() * 180;
    if (roll < 0.08) {
      const baseLane = g.rand() * (LANES - 1);
      g.entities.push({
        at: g.scroll + 380 + g.rand() * 220,
        lane: baseLane,
        baseLane,
        kind: "rival",
        consumed: false,
        wobbleSeed: g.rand() * 12.56,
      });
    } else if (roll < 0.19) {
      const laneSpan = g.rand() < 0.48 ? 1 : 2;
      const maxLane = LANES - laneSpan;
      const lane0 = Math.floor(g.rand() * (maxLane + 1));
      g.entities.push({
        at,
        lane: lane0,
        laneSpan: laneSpan as 1 | 2,
        kind: "egg",
        consumed: false,
      });
    } else if (roll < 0.44) {
      g.entities.push({
        at,
        lane,
        kind: "good",
        id: pickGoodSpawnId(g),
        consumed: false,
      });
    } else if (roll < 0.69) {
      g.entities.push({
        at,
        lane,
        kind: "bad",
        id: BAD_ITEMS[Math.floor(g.rand() * BAD_ITEMS.length)].id,
        consumed: false,
      });
    } else {
      g.entities.push({
        at,
        lane,
        kind: "obs",
        id: OBSTACLES[Math.floor(g.rand() * OBSTACLES.length)].id,
        consumed: false,
      });
    }
    g.nextSpawn = Math.max(g.nextSpawn, g.scroll) + 95 + g.rand() * 70;
  };

  const startRun = useCallback(() => {
    const g = game.current;
    g.scroll = 0;
    g.laneF = 1;
    g.pace = PACE_START;
    g.paceMax = PACE_START;
    g.strideMult = 1;
    g.armor = 0;
    g.canShoot = false;
    g.ammo = 0;
    g.slowUntil = 0;
    g.stunUntil = 0;
    g.entities = [];
    g.projectiles = [];
    g.nextSpawn = 100;
    g.rand = mulberry32((Date.now() ^ (Math.random() * 1e9)) | 0);
    g.toastUntil = 0;
    g.toastText = "";
    g.rushEquipped = createEmptyRushEquipped();
    g.sweetStack = 0;
    g.onionShieldCharges = 0;
    g.omegaShieldCharges = 0;
    g.zincCount = 0;
    g.garlicCount = 0;
    g.citrusFrenzyUntil = 0;
    setHud({
      m: 0,
      pace: PACE_START,
      paceMax: PACE_START,
      ammo: 0,
      canShoot: false,
      toast: "",
      rushEquipped: createEmptyRushEquipped(),
      sweetStack: 0,
      onionShieldCharges: 0,
      omegaShieldCharges: 0,
      zincCount: 0,
      garlicCount: 0,
      citrusComet: false,
    });
    setPhase("play");
    setSavedCloud(null);
  }, []);

  useEffect(() => {
    if (phase !== "countdown") return;
    let c = 3;
    setCountdown(3);
    const id = window.setInterval(() => {
      c -= 1;
      if (c <= 0) {
        window.clearInterval(id);
        setCountdown(null);
        startRun();
      } else {
        setCountdown(c);
      }
    }, 700);
    return () => window.clearInterval(id);
  }, [phase, startRun]);

  /* eslint-disable react-hooks/exhaustive-deps -- RAF loop: applyGood/applyBad only use game ref + module constants */
  useLayoutEffect(() => {
    if (phase !== "play") return;

    let cancelled = false;
    let bootRaf = 0;
    let gameRaf = 0;
    let listenersOn = false;
    const keys: Record<string, boolean> = {};
    let ctx: CanvasRenderingContext2D | null = null;
    let boundCanvas: HTMLCanvasElement | null = null;

    const attachToCanvas = (canvas: HTMLCanvasElement): boolean => {
      const c2d = canvas.getContext("2d");
      if (!c2d) return false;
      ctx = c2d;
      boundCanvas = canvas;
      const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
      const L0 = layoutRef.current;
      canvas.width = Math.round(L0.W * dpr);
      canvas.height = Math.round(L0.H * dpr);
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    };

    const down = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code === "Space") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const fire = () => {
      const g = game.current;
      if (!g.canShoot || g.ammo <= 0) return;
      g.ammo -= 1;
      g.projectiles.push({ pos: g.scroll + 24, lane: g.laneF });
    };

    let last = performance.now();

    const loop = (now: number) => {
      if (cancelled) return;
      const el = canvasRef.current;
      if (!el || !el.isConnected) {
        gameRaf = requestAnimationFrame(loop);
        return;
      }
      if (el !== boundCanvas) {
        if (!attachToCanvas(el)) {
          gameRaf = requestAnimationFrame(loop);
          return;
        }
        if (!listenersOn) {
          window.addEventListener("keydown", down);
          window.addEventListener("keyup", up);
          listenersOn = true;
        }
        last = performance.now();
      }
      if (!ctx) {
        gameRaf = requestAnimationFrame(loop);
        return;
      }
      const L = layoutRef.current;
      const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
      const bw = Math.round(L.W * dpr);
      const bh = Math.round(L.H * dpr);
      if (el.width !== bw || el.height !== bh) {
        el.width = bw;
        el.height = bh;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const g = game.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const citrusFrenzy = now < g.citrusFrenzyUntil;
      if (citrusFrenzy && g.pace < 12) g.pace = Math.min(g.paceMax, 12);

      if (!citrusFrenzy) {
        let decay = PACE_DECAY_PER_SEC * dt;
        if (now < g.slowUntil) decay *= 1.38;
        g.pace = Math.max(0, g.pace - decay);
      }

      if (keys["ArrowLeft"] && (citrusFrenzy || now > g.stunUntil)) {
        g.laneF = Math.max(0, g.laneF - 2.4 * dt);
      }
      if (keys["ArrowRight"] && (citrusFrenzy || now > g.stunUntil)) {
        g.laneF = Math.min(LANES - 1, g.laneF + 2.4 * dt);
      }
      if (keys["Space"]) {
        keys["Space"] = false;
        fire();
      }

      const paceRatio = g.pace / Math.max(1, g.paceMax);
      let sm = g.strideMult;
      if (citrusFrenzy) sm *= 2.35;
      else if (now < g.slowUntil) sm *= 0.72;

      const v = BASE_SPEED * paceRatio * sm;
      g.scroll += v * dt;

      while (g.scroll + 400 > g.nextSpawn) spawnEntity(g);

      g.entities = g.entities.filter((e) => e.at > g.scroll - 200);

      const px = laneCenterX(g.laneF, L.W);
      const py = L.PLAYER_Y;

      for (const e of g.entities) {
        if (e.consumed) continue;

        if (e.kind === "rival") {
          e.lane = Math.max(0, Math.min(LANES - 1, e.baseLane + Math.sin(now * 0.0028 + e.wobbleSeed) * 0.82));
          e.at -= RIVAL_DESCENT * dt;
          if (Math.abs(e.at - g.scroll - HEAD_WORLD) > 20) continue;
          if (Math.abs(e.lane - g.laneF) > 0.38) continue;
          e.consumed = true;
          if (citrusFrenzy) {
            /* комета сносит соперника без урона */
          } else if (!tryAbsorbBump(g)) {
            g.pace = Math.max(0, g.pace - RIVAL_PACE_HIT);
            pushToast(g, `Rival bump! −${RIVAL_PACE_HIT} pulse`);
          }
          continue;
        }

        if (e.kind === "egg") {
          if (Math.abs(e.at - g.scroll) > COLL_BODY) continue;
          const lo = e.lane - LANE_BODY;
          const hi = e.lane + e.laneSpan - 1 + LANE_BODY;
          if (g.laneF < lo || g.laneF > hi) continue;
          e.consumed = true;
          if (citrusFrenzy) {
            /* комета проходит сквозь */
          } else if (!tryAbsorbBump(g)) {
            g.pace = Math.max(0, g.pace - EGG_PACE_HIT);
            pushToast(g, `Egg barrier! −${EGG_PACE_HIT} pulse`);
          }
          continue;
        }

        if (e.kind === "good" || e.kind === "bad") {
          if (Math.abs(e.at - g.scroll - HEAD_WORLD) > COLL_HEAD) continue;
          if (Math.abs(e.lane - g.laneF) > LANE_HEAD) continue;
          e.consumed = true;
          if (e.kind === "good") applyGood(g, e.id);
          else if (citrusFrenzy) {
            /* мусор не цепляет комету */
          } else applyBad(g, e.id);
          continue;
        }

        if (e.kind === "obs") {
          if (Math.abs(e.at - g.scroll) > COLL_BODY) continue;
          if (Math.abs(e.lane - g.laneF) > LANE_BODY) continue;
          e.consumed = true;
          if (citrusFrenzy) {
            /* стена разносится */
          } else if (!tryAbsorbBump(g)) {
            const obs = OBSTACLES.find((o) => o.id === e.id);
            const dmg = Math.max(1, Math.round((obs?.damage ?? 10) * (1 - g.armor)));
            g.pace = Math.max(0, g.pace - dmg);
            pushToast(g, `Hit! −${dmg} pulse`);
          }
        }
      }

      g.projectiles = g.projectiles.filter((p) => {
        p.pos += 520 * dt;
        for (const e of g.entities) {
          if (e.consumed) continue;
          if (e.kind !== "obs" && e.kind !== "rival" && e.kind !== "egg") continue;
          let laneHit = false;
          if (e.kind === "egg") {
            const lo = e.lane - 0.35;
            const hi = e.lane + e.laneSpan - 1 + 0.35;
            laneHit = p.lane >= lo && p.lane <= hi;
          } else {
            laneHit = Math.abs(e.lane - p.lane) <= 0.35;
          }
          if (!laneHit) continue;
          if (p.pos >= e.at - 20 && p.pos <= e.at + 40) {
            e.consumed = true;
            pushToast(
              g,
              e.kind === "rival" ? "Rival zapped!" : e.kind === "egg" ? "Egg cracked!" : "Obstacle cleared!"
            );
            return false;
          }
        }
        return p.pos < g.scroll + 800;
      });

      if (g.pace <= PACE_DEATH_BELOW) {
        g.pace = 0;
        setPhase("dead");
        const meters = Math.floor(g.scroll * METERS_SCALE);
        try {
          const prev = parseInt(localStorage.getItem("ovum_vertical_rush_best_m") || "0", 10) || 0;
          if (meters > prev) localStorage.setItem("ovum_vertical_rush_best_m", String(meters));
          setBestLocal((b) => Math.max(b, meters));
        } catch {
          /* ignore */
        }
        if (isSupabaseConfigured()) {
          void fetch("/api/vertical-rush/score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ distanceM: meters }),
          })
            .then(async (r) => {
              const j = (await r.json().catch(() => null)) as { bestDistanceM?: number; isNewBest?: boolean } | null;
              if (j?.bestDistanceM != null) {
                setSavedCloud(
                  j.isNewBest
                    ? `New cloud best: ${j.bestDistanceM} m`
                    : `Synced · best ${j.bestDistanceM} m`
                );
              }
            })
            .catch(() => setSavedCloud("Cloud sync failed (offline?)"));
        }
        return;
      }

      if (now - g.lastHud > 80) {
        g.lastHud = now;
        const toast =
          now < g.toastUntil ? g.toastText : "";
        setHud({
          m: Math.floor(g.scroll * METERS_SCALE),
          pace: Math.round(g.pace),
          paceMax: Math.round(g.paceMax),
          ammo: g.ammo,
          canShoot: g.canShoot,
          toast,
          rushEquipped: { ...g.rushEquipped },
          sweetStack: g.sweetStack,
          onionShieldCharges: g.onionShieldCharges,
          omegaShieldCharges: g.omegaShieldCharges,
          zincCount: g.zincCount,
          garlicCount: g.garlicCount,
          citrusComet: now < g.citrusFrenzyUntil,
        });
      }

      drawVerticalRushBackground(ctx, L.W, L.H, g.scroll, now);

      for (const e of g.entities) {
        if (e.consumed) continue;
        const screenY = L.PLAYER_Y - (e.at - g.scroll) * TRACK_SCALE;
        if (screenY < -48 || screenY > L.H + 48) continue;
        if (e.kind === "rival") {
          drawRivalSwimmer(ctx, laneCenterX(e.lane, L.W), screenY, now);
        } else if (e.kind === "egg") {
          const cx0 = laneCenterX(e.lane, L.W);
          const cx1 = laneCenterX(e.lane + e.laneSpan - 1, L.W);
          const cxe = (cx0 + cx1) / 2;
          const block = (L.W / LANES) * e.laneSpan;
          drawRivalEgg(ctx, cxe, screenY, now, e.laneSpan, block);
        } else {
          drawPickupOrObstacle(ctx, e.kind, e.id, laneCenterX(e.lane, L.W), screenY, now);
        }
      }

      for (const p of g.projectiles) {
        const screenY = L.PLAYER_Y - (p.pos - g.scroll) * TRACK_SCALE;
        const cx = laneCenterX(p.lane, L.W);
        drawProjectile(ctx, cx, screenY, now);
      }

      if (citrusFrenzy) {
        drawCitrusCometTrail(ctx, px, py, now);
      } else {
        drawPlayerGroundGlow(ctx, px, py, now);
      }
      const slot = playerSlotRef.current;
      if (slot) {
        slot.style.left = `${(laneCenterX(g.laneF, L.W) / L.W) * 100}%`;
        slot.style.top = `${(L.PLAYER_Y / L.H) * 100}%`;
      }

      gameRaf = requestAnimationFrame(loop);
    };

    const boot = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) {
        bootRaf = requestAnimationFrame(boot);
        return;
      }
      if (!attachToCanvas(canvas)) {
        bootRaf = requestAnimationFrame(boot);
        return;
      }
      if (!listenersOn) {
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        listenersOn = true;
      }
      last = performance.now();
      gameRaf = requestAnimationFrame(loop);
    };

    bootRaf = requestAnimationFrame(boot);

    return () => {
      cancelled = true;
      cancelAnimationFrame(bootRaf);
      cancelAnimationFrame(gameRaf);
      if (listenersOn) {
        window.removeEventListener("keydown", down);
        window.removeEventListener("keyup", up);
      }
    };
  }, [phase]);
  /* eslint-enable react-hooks/exhaustive-deps */

  /* Логический трек 360×640 или 640×360 от ориентации окна + размер canvas под вьюпорт. */
  useLayoutEffect(() => {
    if (phase !== "play" && phase !== "dead") return;
    const wrap = viewportRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const sync = () => {
      layoutRef.current = layoutFromViewport(window.innerWidth, window.innerHeight);
      wrap.style.aspectRatio = `${layoutRef.current.W} / ${layoutRef.current.H}`;
      const r = wrap.getBoundingClientRect();
      const cw = Math.max(1, Math.round(r.width));
      const ch = Math.max(1, Math.round(r.height));
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
    };

    sync();
    window.addEventListener("resize", sync);
    const ro = new ResizeObserver(sync);
    ro.observe(wrap);
    return () => {
      window.removeEventListener("resize", sync);
      ro.disconnect();
      wrap.style.aspectRatio = "";
      canvas.style.width = "";
      canvas.style.height = "";
    };
  }, [phase]);

  return (
    <div
      className={`relative mx-auto flex w-full max-w-lg min-w-0 flex-col gap-2 px-safe py-3 pb-safe pt-safe ${
        embed ? "min-h-[100dvh] flex-1" : "min-h-dvh"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        {embed ? (
          <>
            <Button variant="ghost" size="sm" type="button" onClick={() => onExit?.()}>
              Close
            </Button>
            <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Egg climb
            </span>
            <span className="w-14 shrink-0" aria-hidden />
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/lobby">Lobby</Link>
            </Button>
            <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Vertical rush
            </span>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/leaderboard">Ranks</Link>
            </Button>
          </>
        )}
      </div>

      {!embed ? (
        <p className="text-center text-[11px] leading-snug text-muted-foreground">
          Pulse always drains (that is your speed) — buffs refill it and raise the cap. Pickups read by silhouette + glow
          (cool = buff, warm = junk, grey/red = walls). Rotate for landscape. Rose rivals and purple eggs are hazards.
          Zinc greys you (×5); Citrus comet 2s. Parody only — not medical advice.
        </p>
      ) : null}

      {phase === "loading" ? (
        <p className="py-20 text-center text-muted-foreground">Loading…</p>
      ) : null}

      {phase === "countdown" && countdown != null ? (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
          aria-live="polite"
        >
          {embed ? (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40"
              onClick={() => onExit?.()}
            >
              Close
            </Button>
          ) : null}
          <span className="font-display text-[min(22vw,7rem)] font-black tabular-nums text-foreground">{countdown}</span>
          <p className="mt-4 text-xs text-muted-foreground">Arrows · Space (after Citrus) · Esc to exit</p>
          <p className="mt-1 max-w-[240px] text-center text-[10px] text-muted-foreground/80">Parody props — not medical advice.</p>
        </div>
      ) : null}

      {phase === "ready" ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <p className="text-sm text-muted-foreground">Best run (this device): {bestLocal} m</p>
          <div className="w-full max-w-sm space-y-3 rounded-lg border border-purple-500/25 bg-card/40 px-3 py-3 text-left text-[10px] leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground/90">On the track</p>
            <p className="text-foreground/70">
              Pulse (HUD) drains constantly and sets how fast you climb — only head picks up buffs/junk. Rose swimmers,
              wide purple eggs, and grey walls hit the body; shields may absorb. Items have no labels on the track — read
              the shape. Candy / soda / sugar swell the eyes; buff pickups shrink them back. Landscape: rotate the
              device. Parody only, not medical advice.
            </p>
            <div>
              <p className="mb-1 font-medium text-cyan-300/90">Buffs — cool glow + icon</p>
              <ul className="list-inside list-disc space-y-0.5">
                {GOOD_ITEMS.map((it) => (
                  <li key={it.id}>
                    <span className="text-foreground/80">{it.label}</span> — {it.hint}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 font-medium text-pink-300/90">Junk — warm glow + snack shapes</p>
              <ul className="list-inside list-disc space-y-0.5">
                {BAD_ITEMS.map((it) => (
                  <li key={it.id}>
                    <span className="text-foreground/80">{it.label}</span> — {it.hint}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 font-medium text-red-300/90">Walls / eggs — body hit = −pulse (eggs like lobby ovum)</p>
              <ul className="list-inside list-disc space-y-0.5">
                {OBSTACLES.map((it) => (
                  <li key={it.id}>
                    <span className="text-foreground/80">{it.label}</span> — {it.hint}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Button className="neon w-full max-w-xs" size="lg" onClick={startRun}>
            Start run
          </Button>
        </div>
      ) : null}

      {(phase === "play" || phase === "dead") && (
        <div className="relative mx-auto w-full max-w-[min(100%,min(92vw,720px))] shrink-0 rounded-xl border border-purple-500/30 bg-black/80 p-2 shadow-[0_0_40px_rgba(168,85,247,0.15)]">
          <div
            ref={viewportRef}
            className="relative mx-auto w-full min-h-0 min-w-0 shrink-0 overflow-hidden rounded-lg"
            style={{ aspectRatio: "360 / 640" }}
          >
            <canvas
              ref={canvasRef}
              width={360}
              height={640}
              className="absolute left-0 top-0 z-0 block h-full max-h-full w-full max-w-full touch-manipulation"
              style={{
                imageRendering: "pixelated",
              }}
              onPointerDown={(e) => {
                if (phase !== "play") return;
                const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
                const x = e.clientX - rect.left;
                const g = game.current;
                g.laneF = Math.max(0, Math.min(LANES - 1, (x / rect.width) * LANES - 0.5));
              }}
            />
            {profile && (phase === "play" || phase === "dead") ? (
              <div
                ref={playerSlotRef}
                className="pointer-events-none absolute z-[2]"
                style={{
                  left: `${(laneCenterX(1, 360) / 360) * 100}%`,
                  top: `${((640 * 0.78) / 640) * 100}%`,
                  width: 0,
                  height: 0,
                }}
              >
                <div className="relative -translate-x-1/2 -translate-y-1/2">
                  <SwimmerAvatar
                    colorTheme={profile.colorTheme}
                    tailType={profile.tailType}
                    auraEffect={profile.auraEffect}
                    headgear={profile.headgear}
                    faceExtra={profile.faceExtra}
                    neckWear={profile.neckWear}
                    size="lg"
                    facingDeg={-90}
                    moving={phase === "play"}
                    rushEquipped={phase === "play" ? hud.rushEquipped : null}
                    rushSweetStack={phase === "play" ? hud.sweetStack : 0}
                    rushOnionCloud={phase === "play" && hud.onionShieldCharges > 0}
                    rushOmegaCharges={phase === "play" ? hud.omegaShieldCharges : 0}
                    rushZincCount={phase === "play" ? hud.zincCount : 0}
                    rushCitrusComet={phase === "play" && hud.citrusComet}
                    className="drop-shadow-[0_0_14px_rgba(168,85,247,0.45)]"
                  />
                </div>
              </div>
            ) : null}
          </div>
          {phase === "play" ? (
            <div className="mt-2 grid grid-cols-3 gap-1 text-center font-mono text-[10px] text-muted-foreground">
              <span>{hud.m} m</span>
              <span>
                Pulse {hud.pace}/{hud.paceMax}
              </span>
              <span>{hud.canShoot ? `Shots ${hud.ammo}` : "No shots"}</span>
            </div>
          ) : null}
          {hud.toast ? (
            <p className="mt-1 text-center text-[11px] font-medium text-amber-200/90">{hud.toast}</p>
          ) : null}
        </div>
      )}

      {phase === "dead" ? (
        <div className="space-y-3 rounded-lg border border-border bg-card/90 p-4 text-center">
          <p className="font-display text-lg font-bold">Run over</p>
          <p className="text-2xl font-black text-purple-300">{hud.m} m</p>
          <p className="text-xs text-muted-foreground">Local best: {Math.max(bestLocal, hud.m)} m</p>
          {savedCloud ? <p className="text-xs text-emerald-400/90">{savedCloud}</p> : null}
          <div className="flex flex-col gap-2">
            <Button className="neon" onClick={startRun}>
              Again
            </Button>
            {embed ? (
              <Button variant="secondary" type="button" onClick={() => onExit?.()}>
                Back to lobby
              </Button>
            ) : null}
            <Button variant="secondary" asChild>
              <Link href="/leaderboard">Leaderboard</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "play" ? (
        <p className="text-center text-[10px] text-muted-foreground">
          {embed
            ? "Tap left/right to strafe. Dodge rose rivals & purple eggs; head collects buffs/junk only."
            : "Mobile: tap left/right half to strafe. Dodge rose rivals & purple eggs; head collects buffs/junk only."}
        </p>
      ) : null}
    </div>
  );
}
