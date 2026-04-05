"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/mock-mode";
import { loadLocalProfile } from "@/lib/local-profile";
import { Button } from "@/components/ui/button";
import { BAD_ITEMS, GOOD_ITEMS, OBSTACLES, type BadId, type GoodId, type ObstacleId } from "@/lib/vertical-rush-catalog";

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

export function VerticalRushClient() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "play" | "dead">("loading");
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
    setPhase("ready");
  }, [router]);

  const pushToast = (g: typeof game.current, text: string) => {
    g.toastText = text;
    g.toastUntil = performance.now() + 2200;
  };

  const applyGood = (g: typeof game.current, id: GoodId) => {
    switch (id) {
      case "zinc":
        g.hp = Math.min(g.maxHp, g.hp + 18);
        pushToast(g, "+HP (zinc)");
        break;
      case "omega":
        g.speedMult = Math.min(1.55, g.speedMult * 1.12);
        pushToast(g, "+Speed (omega)");
        break;
      case "garlic":
        g.armor = Math.min(0.45, g.armor + 0.12);
        pushToast(g, "+Toughness (garlic)");
        break;
      case "onion_ring":
        g.maxHp += 12;
        g.hp = Math.min(g.maxHp, g.hp + 8);
        pushToast(g, "+Max HP (onion ring)");
        break;
      case "citrus":
        g.canShoot = true;
        g.ammo = Math.min(99, g.ammo + 6);
        pushToast(g, "+Plasma shots!");
        break;
    }
  };

  const applyBad = (g: typeof game.current, id: BadId) => {
    switch (id) {
      case "chips":
        g.speedMult = Math.max(0.55, g.speedMult * 0.88);
        g.slowUntil = performance.now() + 3800;
        pushToast(g, "Slowed (chips)");
        break;
      case "candy":
        g.speedMult = Math.max(0.62, g.speedMult * 0.9);
        g.hp -= 6;
        pushToast(g, "Sticky (candy)");
        break;
      case "soda":
        g.hp -= 10;
        g.slowUntil = performance.now() + 2800;
        pushToast(g, "Bloated (soda)");
        break;
      case "fried_ring":
        g.speedMult = Math.max(0.5, g.speedMult * 0.82);
        pushToast(g, "Greased (fried ring)");
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

  /* eslint-disable react-hooks/exhaustive-deps -- RAF loop: applyGood/applyBad only use game ref + module constants */
  useEffect(() => {
    if (phase !== "play") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    const keys: Record<string, boolean> = {};

    const down = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code === "Space") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    const fire = () => {
      const g = game.current;
      if (!g.canShoot || g.ammo <= 0) return;
      g.ammo -= 1;
      g.projectiles.push({ pos: g.scroll + 24, lane: g.laneF });
    };

    let last = performance.now();

    const loop = (now: number) => {
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
                setSavedCloud(j.isNewBest ? `New best saved: ${j.bestDistanceM} m` : `Synced · best ${j.bestDistanceM} m`);
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

      ctx.fillStyle = "#07070d";
      ctx.fillRect(0, 0, W, H);
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, "#1a1025");
      grd.addColorStop(1, "#0a0a12");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < 14; i++) {
        const yy = ((now * 0.08 + i * 48) % 600) - 20;
        ctx.strokeStyle = "rgba(168,85,247,0.08)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.lineTo(W, yy + 30);
        ctx.stroke();
      }

      for (let L = 1; L < LANES; L++) {
        const x = L * (W / LANES);
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      for (const e of g.entities) {
        if (e.consumed) continue;
        const screenY = PLAYER_Y - (e.at - g.scroll) * 0.92;
        if (screenY < -40 || screenY > H + 40) continue;
        const cx = laneCenterX(e.lane);
        let def: { label: string; emoji: string; color: string };
        if (e.kind === "good") def = GOOD_ITEMS.find((x) => x.id === e.id)!;
        else if (e.kind === "bad") def = BAD_ITEMS.find((x) => x.id === e.id)!;
        else {
          const o = OBSTACLES.find((x) => x.id === e.id)!;
          def = { label: o.label, emoji: o.emoji, color: o.color };
        }
        ctx.fillStyle = def.color + "55";
        ctx.beginPath();
        ctx.arc(cx, screenY, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = "20px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(def.emoji, cx, screenY + 7);
      }

      for (const p of g.projectiles) {
        const screenY = PLAYER_Y - (p.pos - g.scroll) * 0.92;
        const cx = laneCenterX(p.lane);
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(cx, screenY, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#e9d5ff";
      ctx.beginPath();
      ctx.ellipse(px, py, 18, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(px - 5, py - 4, 4, 0, Math.PI * 2);
      ctx.arc(px + 6, py - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.moveTo(px, py + 10);
      ctx.quadraticCurveTo(px - 28, py + 32, px - 42, py + 8);
      ctx.quadraticCurveTo(px - 18, py + 18, px, py + 10);
      ctx.fill();

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-3 px-safe py-4 pb-safe pt-safe">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/lobby">Lobby</Link>
        </Button>
        <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Vertical rush
        </span>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/leaderboard">Ranks</Link>
        </Button>
      </div>

      <p className="text-center text-[11px] leading-snug text-muted-foreground">
        Nokia-style climb: dodge gray blocks, grab cyan/green buffs, avoid brown/pink junk. Arrows move lanes · Space
        shoots (after Citrus pickup). Parody wellness props only — not medical advice.
      </p>

      {phase === "loading" ? (
        <p className="py-20 text-center text-muted-foreground">Loading…</p>
      ) : null}

      {phase === "ready" ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-sm text-muted-foreground">Best run (this device): {bestLocal} m</p>
          <Button className="neon w-full max-w-xs" size="lg" onClick={startRun}>
            Start run
          </Button>
        </div>
      ) : null}

      {(phase === "play" || phase === "dead") && (
        <div className="relative mx-auto rounded-xl border border-purple-500/30 bg-black/80 p-2 shadow-[0_0_40px_rgba(168,85,247,0.15)]">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="mx-auto block h-auto w-full max-w-[min(100%,360px)] touch-manipulation rounded-lg"
            style={{ imageRendering: "pixelated" }}
            onPointerDown={(e) => {
              if (phase !== "play") return;
              const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
              const x = e.clientX - rect.left;
              const g = game.current;
              g.laneF = Math.max(0, Math.min(LANES - 1, (x / rect.width) * LANES - 0.5));
            }}
          />
          {phase === "play" ? (
            <div className="mt-2 grid grid-cols-3 gap-1 text-center font-mono text-[10px] text-muted-foreground">
              <span>Dist {hud.m} m</span>
              <span>
                HP {hud.hp}/{hud.maxHp}
              </span>
              <span>{hud.canShoot ? `Shot ${hud.ammo}` : "No gun"}</span>
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
            <Button variant="secondary" asChild>
              <Link href="/leaderboard">Leaderboard</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "play" ? (
        <p className="text-center text-[10px] text-muted-foreground">
          Tip: tap left/right side of game to strafe on mobile.
        </p>
      ) : null}
    </div>
  );
}
