"use client";

import { useEffect, useMemo } from "react";
import { motion, useAnimation, useReducedMotion } from "framer-motion";
import { useLobbyRhythmStore } from "@/store/lobby-rhythm-store";

const DIM_RGB = "82, 82, 82";

const EGG_PARTICLE_SEEDS = Array.from({ length: 14 }, (_, i) => ({
  key: i,
  left: ((i * 47 + 11) % 78) + 8,
  top: ((i * 61 + 19) % 72) + 10,
  size: 2 + (i % 3),
  duration: 11 + (i % 6) * 1.4,
  delay: -(i * 0.85),
  opacity: 0.35 + (i % 4) * 0.1,
}));

function EggAccentBurst({
  generation,
  active,
}: {
  generation: number;
  active: boolean;
}) {
  const reduce = useReducedMotion();
  const rays = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        rot: ((i * 137 + generation * 19) % 360) * (Math.PI / 180),
        dist: 32 + (i % 6) * 7,
        delay: i * 0.015,
        size: 1.5 + (i % 3) * 0.6,
      })),
    [generation]
  );

  if (!active || reduce || generation < 1) return null;

  return (
    <div className="pointer-events-none absolute inset-[5%] z-[6] flex items-center justify-center overflow-visible rounded-full">
      {rays.map((r, i) => (
        <motion.span
          key={`${generation}-${i}`}
          className="absolute rounded-full bg-white/75 shadow-[0_0_6px_rgba(255,255,255,0.45)]"
          style={{
            width: r.size,
            height: r.size,
            left: "50%",
            top: "50%",
            marginLeft: -r.size / 2,
            marginTop: -r.size / 2,
          }}
          initial={{ opacity: 0.95, scale: 1 }}
          animate={{
            opacity: 0,
            scale: 0.2,
            x: Math.cos(r.rot) * r.dist,
            y: Math.sin(r.rot) * r.dist,
          }}
          transition={{ duration: 0.58, delay: r.delay, ease: [0.22, 1, 0.4, 1] }}
        />
      ))}
    </div>
  );
}

export function LobbyEggZone(props: { online: number; visualPulse: boolean }) {
  const { online, visualPulse } = props;
  const accentGeneration = useLobbyRhythmStore((s) => s.accentGeneration);
  const shell = useAnimation();
  const digit = useAnimation();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!visualPulse || reduce || accentGeneration < 1) return;
    void shell.start({
      scale: [1, 1.06, 1],
      transition: { duration: 0.52, ease: [0.25, 0.88, 0.35, 1] },
    });
    void digit.start({
      scale: [1, 1.12, 1],
      transition: { duration: 0.4, ease: [0.2, 0.9, 0.35, 1] },
    });
  }, [accentGeneration, visualPulse, reduce, shell, digit]);

  return (
    <div
      className="pointer-events-none absolute left-1/2 z-20 aspect-square w-[min(48vmin,300px)] -translate-x-1/2"
      style={{ top: "-24%" }}
      aria-hidden
    >
      <div className="relative h-full w-full">
        <motion.div
          className="absolute -inset-3 rounded-full blur-2xl"
          animate={{ opacity: [0.35, 0.48, 0.35] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          style={{
            background: `linear-gradient(90deg, rgba(255,255,255,0.07) 0%, transparent 45%, transparent 55%, rgba(${DIM_RGB},0.15) 100%)`,
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full p-[7px]"
          animate={{
            boxShadow: [
              `0 0 28px rgba(255,255,255,0.06), inset 0 0 20px rgba(255,255,255,0.03)`,
              `0 0 36px rgba(255,255,255,0.09), inset 0 0 24px rgba(255,255,255,0.04)`,
              `0 0 28px rgba(255,255,255,0.06), inset 0 0 20px rgba(255,255,255,0.03)`,
            ],
          }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          style={{
            background: `linear-gradient(135deg, rgba(${DIM_RGB},0.2), rgba(20,20,20,0.5), rgba(${DIM_RGB},0.12))`,
          }}
        >
          <motion.div
            className="relative h-full w-full origin-center rounded-full"
            animate={shell}
            style={{ transformOrigin: "50% 50%" }}
          >
            <div
              className="relative h-full w-full overflow-hidden rounded-full border border-white/10"
              style={{
                backgroundColor: "rgba(14,14,14,0.96)",
              }}
            >
              <div className="pointer-events-none absolute inset-[5%] overflow-hidden rounded-full">
                {EGG_PARTICLE_SEEDS.map((p) => (
                  <span
                    key={p.key}
                    className="egg-particle absolute rounded-full bg-white/40"
                    style={{
                      left: `${p.left}%`,
                      top: `${p.top}%`,
                      width: p.size + 0.5,
                      height: p.size + 0.5,
                      opacity: p.opacity * 0.9,
                      animation: `egg-particle-drift ${p.duration}s ease-in-out infinite`,
                      animationDelay: `${p.delay}s`,
                    }}
                  />
                ))}
              </div>
              <EggAccentBurst generation={accentGeneration} active={visualPulse} />
              <motion.div
                className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
                animate={digit}
                style={{ transformOrigin: "50% 50%" }}
              >
                <span
                  className="text-[2.65rem] font-semibold tabular-nums tracking-tight text-white"
                  style={{
                    textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                  }}
                >
                  {online}
                </span>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
