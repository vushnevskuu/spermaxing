"use client";

import { useEffect, useMemo } from "react";
import { motion, useAnimation, useReducedMotion } from "framer-motion";
import { useLobbyRhythmStore } from "@/store/lobby-rhythm-store";

/** OVUM neon: fuchsia / purple shell (not flat “barbie” pink). */
const SHELL_RGB = "168, 85, 247";
const SHELL_DEEP_RGB = "88, 28, 135";
const SHELL_ROSE_RGB = "190, 24, 93";
/** Particles: same family, shifted warmer (more red) than shell pink. */
const PARTICLE_RGB = "244, 63, 94";

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
          className="absolute rounded-full bg-fuchsia-200/80 shadow-[0_0_8px_rgba(232,121,249,0.55)]"
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
      style={{ top: "-14%" }}
      aria-hidden
    >
      <div className="relative h-full w-full">
        <motion.div
          className="absolute -inset-3 rounded-full blur-2xl"
          animate={{ opacity: [0.42, 0.58, 0.42] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          style={{
            background: `linear-gradient(125deg, rgba(${SHELL_RGB},0.35) 0%, rgba(${SHELL_ROSE_RGB},0.22) 45%, rgba(${SHELL_DEEP_RGB},0.32) 100%)`,
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full p-[7px]"
          animate={{
            boxShadow: [
              `0 0 32px rgba(${SHELL_RGB},0.35), 0 0 48px rgba(${SHELL_ROSE_RGB},0.15), inset 0 0 26px rgba(${SHELL_DEEP_RGB},0.35)`,
              `0 0 40px rgba(${SHELL_RGB},0.45), 0 0 56px rgba(${SHELL_ROSE_RGB},0.22), inset 0 0 30px rgba(${SHELL_DEEP_RGB},0.42)`,
              `0 0 32px rgba(${SHELL_RGB},0.35), 0 0 48px rgba(${SHELL_ROSE_RGB},0.15), inset 0 0 26px rgba(${SHELL_DEEP_RGB},0.35)`,
            ],
          }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          style={{
            background: `linear-gradient(145deg, rgba(${SHELL_DEEP_RGB},0.55), rgba(${SHELL_ROSE_RGB},0.35), rgba(${SHELL_RGB},0.2))`,
          }}
        >
          <motion.div
            className="relative h-full w-full origin-center will-change-transform"
            animate={reduce ? { scale: 1 } : { scale: [1, 1.026, 1] }}
            transition={{ repeat: Infinity, duration: 3.45, ease: "easeInOut" }}
            style={{ transformOrigin: "50% 54%" }}
          >
            <motion.div
              className="relative h-full w-full origin-center rounded-full"
              animate={shell}
              style={{ transformOrigin: "50% 50%" }}
            >
            <div
              className="relative h-full w-full overflow-hidden rounded-full border border-fuchsia-400/35"
              style={{
                background: `radial-gradient(ellipse 85% 75% at 50% 38%, rgba(${SHELL_ROSE_RGB},0.42) 0%, rgba(${SHELL_DEEP_RGB},0.88) 42%, rgba(12,6,18,0.97) 100%)`,
                boxShadow: "inset 0 0 40px rgba(0,0,0,0.35)",
              }}
            >
              <div className="pointer-events-none absolute inset-[5%] overflow-hidden rounded-full">
                {EGG_PARTICLE_SEEDS.map((p) => (
                  <span
                    key={p.key}
                    className="egg-particle absolute rounded-full"
                    style={{
                      left: `${p.left}%`,
                      top: `${p.top}%`,
                      width: p.size + 0.5,
                      height: p.size + 0.5,
                      opacity: p.opacity * 0.95,
                      backgroundColor: `rgba(${PARTICLE_RGB}, 0.62)`,
                      boxShadow: `0 0 ${4 + (p.key % 3)}px rgba(${PARTICLE_RGB}, 0.45)`,
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
                  className="text-[2.65rem] font-semibold tabular-nums tracking-tight text-fuchsia-50"
                  style={{
                    textShadow:
                      "0 1px 2px rgba(0,0,0,0.65), 0 0 18px rgba(168,85,247,0.35)",
                  }}
                >
                  {online}
                </span>
              </motion.div>
            </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
