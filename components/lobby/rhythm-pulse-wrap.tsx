"use client";

import { useEffect } from "react";
import { motion, useAnimation, useReducedMotion } from "framer-motion";

/** Общая пульсация под акцент (масштаб от центра). */
export function RhythmPulseWrap(props: {
  accentGeneration: number;
  enabled: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { accentGeneration, enabled, children, className } = props;
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
