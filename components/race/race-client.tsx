"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/mock-mode";
import { computeLoadoutStats, raceDurationMs } from "@/lib/avatar-stats";
import { cosmeticsForSeed, parseFaceExtraId, parseHeadgearId, parseNeckWearId } from "@/lib/loadout-cosmetics";
import { loadLocalProfile, saveLocalProfile, type StoredProfile } from "@/lib/local-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SwimmerAvatar } from "@/components/avatar/swimmer-avatar";
import type { AvatarLoadout } from "@/types";

type Racer = {
  id: string;
  nickname: string;
  loadout: AvatarLoadout;
  progress: number;
  score: number;
  /** Bot lane 0–2 for rendering & hit tests; player uses laneRef. */
  lane?: number;
};

function obstacleAt(seed: number, i: number): { t: number; lane: number } {
  const v = Math.abs((seed * 9301 + i * 49297) % 233280) / 233280;
  return { t: 0.08 + v * 0.82, lane: Math.floor(v * 3) % 3 };
}

function nearestObstacleAhead(seed: number, u: number): { t: number; lane: number } | null {
  let best: { t: number; lane: number } | null = null;
  for (let i = 0; i < 8; i++) {
    const o = obstacleAt(seed, i);
    if (o.t <= u + 0.012) continue;
    if (!best || o.t < best.t) best = o;
  }
  return best;
}

function pickBotTargetLane(seed: number, u: number, botLane: number): number {
  const next = nearestObstacleAhead(seed, u);
  if (!next || next.t > u + 0.14) {
    return Math.max(0, Math.min(2, botLane + (1 - botLane) * 0.055));
  }
  const candidates = [0, 1, 2].filter((l) => l !== next.lane);
  let best = candidates[0] ?? 1;
  for (const c of candidates) {
    if (Math.abs(c - botLane) < Math.abs(best - botLane)) best = c;
  }
  return best;
}

function checkObstacleHit(seed: number, u: number, lane: number): boolean {
  for (let i = 0; i < 8; i++) {
    const o = obstacleAt(seed, i);
    if (Math.abs(u - o.t) < 0.018 && Math.round(lane) === o.lane) return true;
  }
  return false;
}

export function RaceClient({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [me, setMe] = useState<StoredProfile | null>(null);
  const [racers, setRacers] = useState<Racer[]>([]);
  const [racePhase, setRacePhase] = useState<"warmup" | "racing" | "done">("warmup");
  const [warmupLabel, setWarmupLabel] = useState<string>("3");
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const warmupTimers = useRef<number[]>([]);
  const seedRef = useRef(1337);
  const durationRef = useRef(18000);
  const startRef = useRef(0);
  const laneRef = useRef(1);
  const rafRef = useRef(0);
  const keysRef = useRef<Record<string, boolean>>({});
  const boostRef = useRef(0);
  const botSpeedRef = useRef(0.00011);
  const finishedRef = useRef(false);
  const savedResultRef = useRef(false);
  const boostMeterRef = useRef<HTMLDivElement | null>(null);
  const hitOverlayRef = useRef<HTMLDivElement | null>(null);
  const trackShakeRef = useRef<HTMLDivElement | null>(null);
  const hitFlashRef = useRef(0);
  const [boostFx, setBoostFx] = useState(0);

  const demo = roomId === "demo";

  const init = useCallback(async () => {
    finishedRef.current = false;
    savedResultRef.current = false;
    hitFlashRef.current = 0;
    const local = loadLocalProfile();
    if (!local) {
      router.replace("/enter");
      return;
    }
    setMe(local);
    let seed = Math.floor(Math.random() * 1e9);
    let opponent: Racer = {
      id: "rival-mock",
      nickname: "Rival.exe",
      loadout: {
        avatarName: "Lag Spirit",
        colorTheme: "void",
        tailType: "bubble",
        auraEffect: "spark",
        ...cosmeticsForSeed(90210),
      },
      progress: 0,
      score: 0,
      lane: 1,
    };

    if (!demo && isSupabaseConfigured()) {
      const supabase = createClient();
      const { data: room } = await supabase
        .from("race_rooms")
        .select("seed")
        .eq("id", roomId)
        .maybeSingle();
      if (room?.seed != null) seed = room.seed;
      const { data: entries } = await supabase
        .from("race_entries")
        .select("profile_id")
        .eq("race_room_id", roomId);
      const ids = entries?.map((e) => e.profile_id) ?? [];
      const oid = ids.find((id) => id !== local.id);
      if (oid) {
        const { data: pr } = await supabase.from("profiles").select("nickname").eq("id", oid).maybeSingle();
        const { data: av } = await supabase
          .from("avatars")
          .select("avatar_name,color_theme,tail_type,aura_effect,headgear,face_extra,neck_wear")
          .eq("profile_id", oid)
          .maybeSingle();
        opponent = {
          id: oid,
          nickname: pr?.nickname ?? "Rival",
          loadout: {
            avatarName: av?.avatar_name ?? "Rival",
            colorTheme: (av?.color_theme as AvatarLoadout["colorTheme"]) ?? "electric",
            tailType: (av?.tail_type as AvatarLoadout["tailType"]) ?? "fin",
            auraEffect: (av?.aura_effect as AvatarLoadout["auraEffect"]) ?? "rings",
            headgear: parseHeadgearId(av?.headgear),
            faceExtra: parseFaceExtraId(av?.face_extra),
            neckWear: parseNeckWearId(av?.neck_wear),
          },
          progress: 0,
          score: 0,
          lane: 1,
        };
      }
    }

    seedRef.current = seed;
    durationRef.current = raceDurationMs(seed);
    const botStats = computeLoadoutStats(opponent.loadout);
    botSpeedRef.current = 0.00009 + botStats.speed * 1.2e-7;

    const meRacer: Racer = {
      id: local.id,
      nickname: local.nickname,
      loadout: {
        avatarName: local.avatarName,
        colorTheme: local.colorTheme,
        tailType: local.tailType,
        auraEffect: local.auraEffect,
        headgear: local.headgear,
        faceExtra: local.faceExtra,
        neckWear: local.neckWear,
      },
      progress: 0,
      score: 0,
    };

    laneRef.current = 1;
    setRacers([meRacer, { ...opponent, lane: opponent.lane ?? 1 }]);
    startRef.current = 0;
    setRacePhase("warmup");
    setWarmupLabel("3");
    boostRef.current = 0;
  }, [demo, roomId, router]);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    warmupTimers.current.forEach((id) => window.clearTimeout(id));
    warmupTimers.current = [];
    if (racePhase !== "warmup" || racers.length < 2) return;

    const schedule = (ms: number, fn: () => void) => {
      const id = window.setTimeout(fn, ms);
      warmupTimers.current.push(id);
    };

    schedule(0, () => setWarmupLabel("3"));
    schedule(700, () => setWarmupLabel("2"));
    schedule(1400, () => setWarmupLabel("1"));
    schedule(2100, () => setWarmupLabel("GO!"));
    schedule(2600, () => {
      startRef.current = performance.now();
      setRacePhase("racing");
    });

    return () => {
      warmupTimers.current.forEach((id) => window.clearTimeout(id));
      warmupTimers.current = [];
    };
  }, [racePhase, racers.length]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === "Space") {
        e.preventDefault();
        boostRef.current = Math.min(0.12, boostRef.current + 0.035);
        setBoostFx((n) => n + 1);
      }
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [setBoostFx]);

  useEffect(() => {
    if (!me || racePhase !== "racing" || racers.length < 2) return;

    const loadout: AvatarLoadout = {
      avatarName: me.avatarName,
      colorTheme: me.colorTheme,
      tailType: me.tailType,
      auraEffect: me.auraEffect,
      headgear: me.headgear,
      faceExtra: me.faceExtra,
      neckWear: me.neckWear,
    };
    const laneStep = 0.07 + computeLoadoutStats(loadout).handling * 0.00035;

    const loop = (now: number) => {
      if (finishedRef.current) return;
      const t = now - startRef.current;
      const dur = durationRef.current;
      const u = Math.min(1, t / dur);
      if (keysRef.current["ArrowLeft"]) laneRef.current = Math.max(0, laneRef.current - laneStep);
      if (keysRef.current["ArrowRight"]) laneRef.current = Math.min(2, laneRef.current + laneStep);

      setRacers((prev) => {
        if (prev.length < 2) return prev;
        const myR = prev.find((r) => r.id === me.id);
        const botR = prev.find((r) => r.id !== me.id);
        if (!myR || !botR) return prev;

        const myStats = computeLoadoutStats(myR.loadout);
        const hit = checkObstacleHit(seedRef.current, u, laneRef.current);
        if (hit) hitFlashRef.current = 1;

        const impulse = boostRef.current;
        boostRef.current = Math.max(0, impulse - 0.004);

        const base = 0.0001 + myStats.speed * 1.2e-7;
        const myDelta = (hit ? base * 0.4 : base * 1.08) + impulse * 0.00025 + myStats.boost * 8e-8;

        const botLanePrev = botR.lane ?? 1;
        const targetLane = pickBotTargetLane(seedRef.current, u, botLanePrev);
        const botLaneNext = Math.max(
          0,
          Math.min(2, botLanePrev + (targetLane - botLanePrev) * 0.13)
        );
        const botHit = checkObstacleHit(seedRef.current, u, botLaneNext);
        const botStats = computeLoadoutStats(botR.loadout);
        let botDelta =
          botSpeedRef.current * (0.88 + Math.sin(now / 420) * 0.06) + botStats.boost * 6e-8;
        botDelta *= botHit ? 0.42 : 1.06;

        const myNext = Math.min(1, myR.progress + myDelta);
        const botNext = Math.min(1, botR.progress + botDelta);

        const next = prev.map((r) => {
          if (r.id === me.id) {
            return {
              ...r,
              progress: myNext,
              score: r.score + (hit ? -1 : 2),
            };
          }
          return {
            ...r,
            progress: botNext,
            score: r.score + (botHit ? -1 : 2),
            lane: botLaneNext,
          };
        });

        const leader = next.reduce((a, b) => (a.progress >= b.progress ? a : b));
        if (u >= 1 || next.every((r) => r.progress >= 0.9995)) {
          finishedRef.current = true;
          cancelAnimationFrame(rafRef.current);
          setRacePhase("done");
          setWinnerId(leader.id);
        }

        return next;
      });

      hitFlashRef.current *= 0.88;
      const el = hitOverlayRef.current;
      if (el) {
        const a = Math.min(0.45, hitFlashRef.current * 0.35);
        el.style.backgroundColor = a > 0.02 ? `rgba(248,113,113,${a})` : "transparent";
      }
      const tr = trackShakeRef.current;
      if (tr) {
        const sh = hitFlashRef.current;
        if (sh > 0.035) {
          tr.style.transform = `translate3d(${Math.sin(now * 0.12) * sh * 5}px,${Math.cos(now * 0.11) * sh * 3}px,0)`;
        } else {
          tr.style.transform = "";
        }
      }
      const bm = boostMeterRef.current;
      if (bm) {
        bm.style.width = `${Math.min(100, (boostRef.current / 0.12) * 100)}%`;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [me, racePhase, racers.length]);

  const onTapBoost = () => {
    boostRef.current = Math.min(0.12, boostRef.current + 0.035);
    setBoostFx((n) => n + 1);
  };

  const podium = useMemo(() => [...racers].sort((a, b) => b.progress - a.progress), [racers]);

  useEffect(() => {
    if (racePhase !== "done" || !me || savedResultRef.current) return;
    savedResultRef.current = true;
    const place = podium.findIndex((r) => r.id === me.id) + 1;
    const next: StoredProfile = {
      ...me,
      wins: place === 1 ? me.wins + 1 : me.wins,
      streak: place === 1 ? me.streak + 1 : 0,
      podiums: place <= 3 ? me.podiums + 1 : me.podiums,
    };
    saveLocalProfile(next);
    setMe(next);

    if (!demo && isSupabaseConfigured()) {
      void (async () => {
        const supabase = createClient();
        await supabase
          .from("race_entries")
          .update({
            place,
            score: Math.round(podium.find((r) => r.id === me.id)?.score ?? 0),
            stats: { lane: laneRef.current },
          })
          .eq("race_room_id", roomId)
          .eq("profile_id", me.id);
        await supabase
          .from("profiles")
          .update({
            wins: next.wins,
            streak: next.streak,
            podiums: next.podiums,
          })
          .eq("id", me.id);
      })();
    }
  }, [racePhase, me, podium, demo, roomId]);

  if (!me) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">Loading…</div>
    );
  }

  const meR = racers.find((r) => r.id === me.id);
  const prog = meR?.progress ?? 0;

  const botR = racers.find((r) => r.id !== me.id);
  const botProg = botR?.progress ?? 0;
  const botLaneVis = botR?.lane ?? 1;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "repeating-linear-gradient(180deg, transparent, transparent 14px, rgba(255,255,255,0.03) 15px)",
        }}
      />
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] px-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="outline" className="font-display tracking-wide">
            Room: {demo ? "demo" : roomId.slice(0, 8)}
          </Badge>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <Link href="/rush">Arcade</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/lobby">Lobby</Link>
            </Button>
          </div>
        </div>
        <p className="text-center text-[10px] leading-snug text-muted-foreground">
          <span className="text-foreground/85">Sprint heat</span> — three lanes, dodge the neon hazards, push your progress past
          the rival. Separate mode:{" "}
          <Link href="/rush" className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
            Vertical rush
          </Link>
          . Entertainment only — not medical advice.
        </p>

        <AnimatePresence mode="wait">
          {racePhase !== "done" ? (
            <motion.div
              key="race"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="arcade-panel relative mx-auto min-h-[min(72dvh,620px)] w-full max-w-[360px] overflow-hidden rounded-xl border border-purple-500/35 bg-[#06020f] shadow-[0_0_48px_rgba(168,85,247,0.22),0_0_80px_rgba(34,211,238,0.06)]"
              style={{ perspective: "720px" }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 85% 55% at 50% 38%, rgba(109,40,217,0.32), transparent 62%), radial-gradient(ellipse 70% 45% at 50% 100%, rgba(34,211,238,0.08), transparent 55%), linear-gradient(180deg, #12051f 0%, #07030f 42%, #020105 100%)",
                }}
              />
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.45] animate-speed-lines"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(180deg, transparent 0px, transparent 9px, rgba(34,211,238,0.07) 10px, transparent 11px)",
                  backgroundSize: "100% 20px",
                  transform: racePhase === "racing" ? `translateY(${(prog * 14) % 20}px)` : undefined,
                }}
              />
              <div
                className="pointer-events-none absolute bottom-[-8%] left-1/2 z-0 h-[42%] w-[220%] -translate-x-1/2 grid-floor animate-grid-drift rounded-t-[45%] opacity-[0.55]"
                style={{
                  transform: "translateX(-50%) rotateX(56deg)",
                  transformOrigin: "50% 100%",
                  filter: "hue-rotate(-8deg) saturate(1.15)",
                }}
              />

              <div
                ref={hitOverlayRef}
                className="pointer-events-none absolute inset-0 z-[15]"
                style={{ backgroundColor: "transparent" }}
              />

              <div className="absolute left-0 right-0 top-0 z-20 border-b border-white/5 bg-black/55 px-2 pb-1.5 pt-1 backdrop-blur-[2px]">
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <div className="mb-0.5 flex justify-between px-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-cyan-200/90">
                      <span>You</span>
                      <span>{Math.round(prog * 100)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10 shadow-inner">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300 shadow-[0_0_14px_rgba(34,211,238,0.55)]"
                        animate={{ width: `${Math.max(3, Math.round(prog * 100))}%` }}
                        transition={{ type: "spring", stiffness: 200, damping: 24 }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-0.5 flex justify-between px-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-fuchsia-200/85">
                      <span>Rival</span>
                      <span>{Math.round(botProg * 100)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10 shadow-inner">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-400 to-amber-300 shadow-[0_0_14px_rgba(232,121,249,0.45)]"
                        animate={{ width: `${Math.max(3, Math.round(botProg * 100))}%` }}
                        transition={{ type: "spring", stiffness: 200, damping: 24 }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute left-3 right-3 top-[3.9rem] z-10 flex flex-col gap-1 text-[10px] font-mono text-muted-foreground">
                <div className="flex justify-between gap-1">
                  <span className="leading-tight text-cyan-100/75">← → lanes · avoid the purple orbs</span>
                  <span className="shrink-0 text-amber-200/90">Space / GO — boost</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-cyan-500/15">
                  <div
                    ref={boostMeterRef}
                    className="h-full w-0 rounded-full bg-gradient-to-r from-amber-300 to-cyan-300 shadow-[0_0_12px_rgba(250,204,21,0.45)] transition-[width] duration-75"
                  />
                </div>
              </div>

              <div ref={trackShakeRef} className="absolute inset-x-0 bottom-0 top-[5.35rem] z-[1] will-change-transform">
                {[0, 1, 2].map((lane) => (
                  <div
                    key={lane}
                    className="pointer-events-none absolute bottom-0 top-0 w-[30%] opacity-[0.14]"
                    style={{
                      left: `${5 + lane * 30}%`,
                      background:
                        "linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.35) 45%, rgba(34,211,238,0.2) 50%, rgba(168,85,247,0.35) 55%, transparent 100%)",
                    }}
                  />
                ))}
                {[0, 1, 2].map((lane) => (
                  <div
                    key={`g-${lane}`}
                    className="absolute bottom-0 top-0 w-px bg-gradient-to-b from-cyan-300/25 via-fuchsia-400/15 to-transparent shadow-[0_0_8px_rgba(34,211,238,0.25)]"
                    style={{ left: `${20 + lane * 30}%` }}
                  />
                ))}

                <div className="absolute inset-0 z-[2]">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const o = obstacleAt(seedRef.current, i);
                    return (
                      <div
                        key={i}
                        className="animate-race-hazard-pulse absolute flex h-[3.25rem] w-[3.25rem] items-center justify-center"
                        style={{
                          left: `${20 + o.lane * 30}%`,
                          top: `${12 + o.t * 76}%`,
                          animationDelay: `${(i * 0.31) % 2.2}s`,
                        }}
                        aria-hidden
                      >
                        <div className="relative h-[2.65rem] w-[2.65rem] rounded-full border-2 border-fuchsia-400/90 bg-gradient-to-br from-rose-600/75 via-purple-900/55 to-indigo-950/80 shadow-[0_0_22px_rgba(244,63,94,0.5),inset_0_0_12px_rgba(0,0,0,0.35)] ring-2 ring-rose-400/35">
                          <div className="absolute inset-[5px] rounded-full border border-white/25 bg-white/5" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[11px] font-black tracking-tight text-amber-200/95 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]">
                              ×
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {racePhase === "racing" && meR && botR ? (
                    <svg
                      className="pointer-events-none absolute inset-0 z-[3] overflow-visible"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      aria-hidden
                    >
                      <defs>
                        <filter id={`ovum-race-rival-glow-${roomId}`} x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="0.9" result="b" />
                          <feMerge>
                            <feMergeNode in="b" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <line
                        x1={20 + laneRef.current * 30}
                        y1={14 + (1 - prog) * 72}
                        x2={20 + botLaneVis * 30}
                        y2={14 + (1 - botProg) * 72}
                        stroke="rgba(250, 204, 21, 0.55)"
                        strokeWidth="0.55"
                        strokeDasharray="2 2.2"
                        strokeLinecap="round"
                        filter={`url(#ovum-race-rival-glow-${roomId})`}
                      />
                    </svg>
                  ) : null}

                  {botR ? (
                    <motion.div
                      className="absolute z-[4] -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${20 + botLaneVis * 30}%`,
                        top: `${14 + (1 - botProg) * 72}%`,
                      }}
                      transition={{ type: "spring", stiffness: 200, damping: 24 }}
                    >
                      <div className="rounded-full p-0.5 ring-1 ring-fuchsia-400/35">
                        <SwimmerAvatar
                          colorTheme={botR.loadout.colorTheme}
                          tailType={botR.loadout.tailType}
                          auraEffect={botR.loadout.auraEffect}
                          headgear={botR.loadout.headgear}
                          faceExtra={botR.loadout.faceExtra}
                          neckWear={botR.loadout.neckWear}
                          size="sm"
                          moving={racePhase === "racing"}
                        />
                      </div>
                    </motion.div>
                  ) : null}

                  <motion.div
                    className="absolute z-[5] -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${20 + laneRef.current * 30}%`,
                      top: `${14 + (1 - prog) * 72}%`,
                    }}
                    layout
                    transition={{ type: "spring", stiffness: 280, damping: 28 }}
                  >
                    <div className="rounded-full bg-cyan-500/10 p-0.5 shadow-[0_0_20px_rgba(34,211,238,0.35)] ring-2 ring-cyan-300/50">
                      {meR ? (
                        <SwimmerAvatar
                          colorTheme={meR.loadout.colorTheme}
                          tailType={meR.loadout.tailType}
                          auraEffect={meR.loadout.auraEffect}
                          headgear={meR.loadout.headgear}
                          faceExtra={meR.loadout.faceExtra}
                          neckWear={meR.loadout.neckWear}
                          size="sm"
                          moving={racePhase === "racing"}
                        />
                      ) : null}
                    </div>
                  </motion.div>
                </div>
              </div>

              <AnimatePresence>
                {racePhase === "warmup" ? (
                  <motion.div
                    key={warmupLabel}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.2, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                    className="absolute inset-0 z-30 flex items-center justify-center bg-black/75"
                  >
                    <span className="font-display text-7xl font-black tracking-tight text-foreground md:text-8xl">
                      {warmupLabel}
                    </span>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <button
                type="button"
                className="absolute bottom-[max(1rem,env(safe-area-inset-bottom,0px))] left-1/2 z-20 flex h-16 w-16 min-h-[56px] min-w-[56px] -translate-x-1/2 touch-manipulation items-center justify-center rounded-full border-2 border-cyan-400/50 bg-gradient-to-b from-zinc-800 to-black font-display text-xs font-bold text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.35)] active:scale-95 md:hidden"
                onPointerDown={onTapBoost}
              >
                {boostFx > 0 ? (
                  <span
                    key={boostFx}
                    className="animate-race-boost-ring pointer-events-none absolute inset-0 rounded-full border-2 border-amber-300/70"
                    aria-hidden
                  />
                ) : null}
                GO
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="podium"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="arcade-panel p-6"
            >
              <h2 className="text-center font-display text-2xl font-semibold tracking-tight text-foreground">
                Podium
              </h2>
              <ol className="mt-6 space-y-3">
                {podium.map((r, idx) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-sm border border-border bg-white/5 px-4 py-3"
                  >
                    <span className="text-lg font-semibold text-muted-foreground">#{idx + 1}</span>
                    <span className="font-semibold">{r.nickname}</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(r.progress * 100)}%
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                {winnerId === me.id
                  ? "You took the stage. Progress saved locally and in the cloud (with Supabase)."
                  : "No worries — run it back."}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link href="/lobby">Back to lobby</Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href="/rush">Arcade</Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href="/leaderboard">Leaderboard</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
