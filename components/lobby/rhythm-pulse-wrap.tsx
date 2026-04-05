"use client";

import { useEffect } from "react";
import { motion, useAnimation, useReducedMotion } from "framer-motion";
import { useLobbyRhythmStore } from "@/store/lobby-rhythm-store";

/** Общая пульсация под акцент (масштаб от центра). Счётчик акцента читается из стора — без лишних ререндеров родителя. */
export function RhythmPulseWrap(props: {
  enabled: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { enabled, children, className } = props;
  const accentGeneration = useLobbyRhythmStore((s) => s.accentGeneration);
  const c = useAnimation();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!enabled || reduce || accentGeneration < 1) return;
    void c.start({
      scale: [1, 1.08, 1],
      transition: { duration: 0.5, ease: [0.25, 0.85, 0.35, 1] },
    });
  }, [accentGeneration, enabled, reduce, c]);

  return (
    <motion.div className={className ?? "origin-center"} animate={c} style={{ transformOrigin: "50% 50%" }}>
      {children}
    </motion.div>
  );
}
