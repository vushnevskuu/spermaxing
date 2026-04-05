"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/mock-mode";
import { loadLocalProfile } from "@/lib/local-profile";
import { Button } from "@/components/ui/button";
import { BAD_ITEMS, GOOD_ITEMS, OBSTACLES, type BadId, type GoodId, type ObstacleId } from "@/lib/vertical-rush-catalog";
import {
  drawLaneDividers,
  drawPickupOrObstacle,
  drawPlayerSwimmer,
  drawProjectile,
  drawVerticalRushBackground,
} from "@/lib/vertical-rush-render";

const W = 360;
const H = 640;
const LANES = 3;
const PLAYER_Y = H * 0.78;
const COLL = 38;
const BASE_SPEED = 195;
const METERS_SCALE = 1 / 12;

type Ent = {
  at: number;
  lane: number;
  kind: "good" | "bad" | "obs";
  id: GoodId | BadId | ObstacleId;
  consumed: boolean;
};

type Proj = { pos: number; lane: number };

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function laneCenterX(lane: number): number {
  return (lane + 0.5) * (W / LANES);
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
  const [phase, setPhase] = useState<"loading" | "countdown" | "ready" | "play" | "dead">("loading");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hud, setHud] = useState({
    m: 0,
    hp: 100,
    maxHp: 100,
    ammo: 0,
    canShoot: false,
    toast: "" as string,
  });
  const [bestLocal, setBestLocal] = useState(0);
  const [savedCloud, setSavedCloud] = useState<string | null>(null);

  const game = useRef({
    scroll: 0,
    laneF: 1,
    hp: 100,
    maxHp: 100,
    speedMult: 1,
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
  });

  useEffect(() => {
    const p = loadLocalProfile();
    if (!p) {
      router.replace("/enter");
      return;
    }
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

  const applyGood = (g: typeof game.current, id: GoodId) => {
    switch (id) {
      case "zinc":
        g.hp = Math.min(g.maxHp, g.hp + 18);
        pushToast(g, "Zinc: +HP");
        break;
      case "omega":
        g.speedMult = Math.min(1.55, g.speedMult * 1.12);
        pushToast(g, "Omega: +speed");
        break;
      case "garlic":
        g.armor = Math.min(0.45, g.armor + 0.12);
        pushToast(g, "Garlic: +toughness");
        break;
      case "onion_ring":
        g.maxHp += 12;
        g.hp = Math.min(g.maxHp, g.hp + 8);
        pushToast(g, "Onion ring: +max HP");
        break;
      case "citrus":
        g.canShoot = true;
        g.ammo = Math.min(99, g.ammo + 6);
        pushToast(g, "Citrus: shots unlocked!");
        break;
    }
  };

  const applyBad = (g: typeof game.current, id: BadId) => {
    switch (id) {
      case "chips":
        g.speedMult = Math.max(0.55, g.speedMult * 0.88);
        g.slowUntil = performance.now() + 3800;
        pushToast(g, "Chips: slowed");
        break;
      case "candy":
        g.speedMult = Math.max(0.62, g.speedMult * 0.9);
        g.hp -= 6;
        pushToast(g, "Candy: sticky, −HP");
        break;
      case "soda":
        g.hp -= 10;
        g.slowUntil = performance.now() + 2800;
        pushToast(g, "Soda: bloated");
        break;
      case "fried_ring":
        g.speedMult = Math.max(0.5, g.speedMult * 0.82);
        pushToast(g, "Fried ring: greased");
        break;
      case "sugar_cube":
        g.hp -= 14;
        g.stunUntil = performance.now() + 420;
        pushToast(g, "Sugar crash!");
        break;
    }
  };

  const spawnEntity = (g: typeof game.current) => {
    const lane = Math.floor(g.rand() * LANES);
    const roll = g.rand();
    let kind: Ent["kind"];
    let id: GoodId | BadId | ObstacleId;
    if (roll < 0.28) {
      kind = "good";
      id = GOOD_ITEMS[Math.floor(g.rand() * GOOD_ITEMS.length)].id;
    } else if (roll < 0.52) {
      kind = "bad";
      id = BAD_ITEMS[Math.floor(g.rand() * BAD_ITEMS.length)].id;
    } else {
      kind = "obs";
      id = OBSTACLES[Math.floor(g.rand() * OBSTACLES.length)].id;
    }
    g.entities.push({
      at: g.scroll + 520 + g.rand() * 180,
      lane,
      kind,
      id,
      consumed: false,
    });
    g.nextSpawn = g.scroll + 95 + g.rand() * 70;
  };

  const startRun = useCallback(() => {
    const g = game.current;
    g.scroll = 0;
    g.laneF = 1;
    g.hp = 100;
    g.maxHp = 100;
    g.speedMult = 1;
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
    setHud({ m: 0, hp: 100, maxHp: 100, ammo: 0, canShoot: false, toast: "" });
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
      canvas.width = W * dpr;
      canvas.height = H * dpr;
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
      const g = game.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (keys["ArrowLeft"] && now > g.stunUntil) {
        g.laneF = Math.max(0, g.laneF - 2.4 * dt);
      }
      if (keys["ArrowRight"] && now > g.stunUntil) {
        g.laneF = Math.min(LANES - 1, g.laneF + 2.4 * dt);
      }
      if (keys["Space"]) {
        keys["Space"] = false;
        fire();
      }

      let sm = g.speedMult;
      if (now < g.slowUntil) sm *= 0.72;

      const v = BASE_SPEED * sm;
      g.scroll += v * dt;

      while (g.scroll + 400 > g.nextSpawn) spawnEntity(g);

      g.entities = g.entities.filter((e) => e.at > g.scroll - 120);

      const px = laneCenterX(g.laneF);
      const py = PLAYER_Y;

      for (const e of g.entities) {
        if (e.consumed) continue;
        if (Math.abs(e.at - g.scroll) > COLL) continue;
        if (Math.abs(e.lane - g.laneF) > 0.42) continue;
        e.consumed = true;
        if (e.kind === "good") applyGood(g, e.id as GoodId);
        else if (e.kind === "bad") applyBad(g, e.id as BadId);
        else {
          const obs = OBSTACLES.find((o) => o.id === e.id);
          const dmg = Math.max(1, Math.round((obs?.damage ?? 10) * (1 - g.armor)));
          g.hp -= dmg;
          pushToast(g, `Hit! −${dmg} HP`);
        }
      }

      g.projectiles = g.projectiles.filter((p) => {
        p.pos += 520 * dt;
        for (const e of g.entities) {
          if (e.consumed || e.kind !== "obs") continue;
          if (Math.abs(e.lane - p.lane) > 0.35) continue;
          if (p.pos >= e.at - 20 && p.pos <= e.at + 40) {
            e.consumed = true;
            pushToast(g, "Obstacle cleared!");
            return false;
          }
        }
        return p.pos < g.scroll + 800;
      });

      if (g.hp <= 0) {
        g.hp = 0;
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
          hp: Math.round(g.hp),
          maxHp: Math.round(g.maxHp),
          ammo: g.ammo,
          canShoot: g.canShoot,
          toast,
        });
      }

      drawVerticalRushBackground(ctx, W, H, g.scroll, now);
      drawLaneDividers(ctx, W, H, LANES, now);

      for (const e of g.entities) {
        if (e.consumed) continue;
        const screenY = PLAYER_Y - (e.at - g.scroll) * 0.92;
        if (screenY < -48 || screenY > H + 48) continue;
        const cx = laneCenterX(e.lane);
        drawPickupOrObstacle(ctx, e.kind, e.id, cx, screenY, now);
      }

      for (const p of g.projectiles) {
        const screenY = PLAYER_Y - (p.pos - g.scroll) * 0.92;
        const cx = laneCenterX(p.lane);
        drawProjectile(ctx, cx, screenY, now);
      }

      drawPlayerSwimmer(ctx, px, py, now);

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

  /* Explicit canvas CSS px from layout box: avoids WebKit/flex cases where bitmap draws but compositor shows empty. */
  useLayoutEffect(() => {
    if (phase !== "play" && phase !== "dead") return;
    const wrap = viewportRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const sync = () => {
      const r = wrap.getBoundingClientRect();
      const cw = Math.max(1, Math.round(r.width));
      const ch = Math.max(1, Math.round(r.height));
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(wrap);
    return () => {
      ro.disconnect();
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
          Nokia-style climb: you move up through lanes. Buffs (cyan ring), junk debuffs (pink dashed ring), and
          red-framed walls hurt on contact. Arrows strafe · Space shoots after Citrus. Parody wellness props only — not
          medical advice.
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
            <div>
              <p className="mb-1 font-medium text-cyan-300/90">Buffs (cyan outline)</p>
              <ul className="list-inside list-disc space-y-0.5">
                {GOOD_ITEMS.map((it) => (
                  <li key={it.id}>
                    <span className="text-foreground/80">{it.label}</span> — {it.hint}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 font-medium text-pink-300/90">Junk (pink dashed outline)</p>
              <ul className="list-inside list-disc space-y-0.5">
                {BAD_ITEMS.map((it) => (
                  <li key={it.id}>
                    <span className="text-foreground/80">{it.label}</span> — {it.hint}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 font-medium text-red-300/90">Obstacles (red frame) — crash = −HP</p>
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
        <div className="relative mx-auto w-full max-w-[min(100%,360px)] shrink-0 rounded-xl border border-purple-500/30 bg-black/80 p-2 shadow-[0_0_40px_rgba(168,85,247,0.15)]">
          <div
            ref={viewportRef}
            className="relative mx-auto w-full min-h-0 min-w-0 shrink-0 overflow-hidden rounded-lg"
            style={{ aspectRatio: `${W} / ${H}` }}
          >
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="absolute left-0 top-0 block h-full max-h-full w-full max-w-full touch-manipulation"
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
          </div>
          {phase === "play" ? (
            <div className="mt-2 grid grid-cols-3 gap-1 text-center font-mono text-[10px] text-muted-foreground">
              <span>{hud.m} m</span>
              <span>
                HP {hud.hp}/{hud.maxHp}
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
          {embed ? "Tap left/right on the game to strafe." : "Mobile: tap the left or right half of the game to strafe lanes."}
        </p>
      ) : null}
    </div>
  );
}
