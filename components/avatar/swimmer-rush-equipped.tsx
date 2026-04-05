"use client";

import { motion } from "framer-motion";
import type { RushEquippedFlags } from "@/lib/vertical-rush-equipped";

type Phase = "body" | "face" | "mouthCorner";

function RushOmegaHelmetPulse(props: { reduceMotion: boolean }) {
  if (props.reduceMotion) return null;
  return (
    <motion.ellipse
      cx={40}
      cy={22}
      rx={19}
      ry={15.5}
      fill="none"
      stroke="rgba(253, 224, 71, 0.35)"
      strokeWidth={1}
      animate={{ opacity: [0.4, 0.85, 0.4] }}
      transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
    />
  );
}

/** Жёлтый полупрозрачный «шлем» вокруг головы (omega shield charges > 0). */
export function RushOmegaHelmet(props: { charges: number; reduceMotion: boolean }) {
  const { charges, reduceMotion } = props;
  if (charges <= 0) return null;
  return (
    <g aria-hidden>
      <ellipse
        cx={40}
        cy={22}
        rx={19}
        ry={15.5}
        fill="rgba(254, 240, 138, 0.2)"
        stroke="#eab308"
        strokeWidth={1.6}
      />
      <ellipse
        cx={40}
        cy={22}
        rx={16}
        ry={12.5}
        fill="none"
        stroke="rgba(250, 204, 21, 0.45)"
        strokeWidth={0.9}
        strokeDasharray="3 3"
      />
      <RushOmegaHelmetPulse reduceMotion={reduceMotion} />
    </g>
  );
}

/** Зелёное облако «вонючки» впереди головы (луковый щит). */
export function RushOnionCloud(props: { active: boolean; reduceMotion: boolean }) {
  const { active, reduceMotion } = props;
  if (!active) return null;
  const blobs = (
    <>
      <ellipse cx={0} cy={0} rx={10} ry={7} fill="rgba(34, 197, 94, 0.38)" stroke="rgba(21, 128, 61, 0.55)" strokeWidth={0.9} />
      <ellipse cx={-6} cy={2} rx={5} ry={4} fill="rgba(74, 222, 128, 0.32)" />
      <ellipse cx={7} cy={-1} rx={4} ry={5} fill="rgba(22, 163, 74, 0.28)" />
    </>
  );
  /* Базовый translate на статическом <g>: иначе Framer при animate.x перезаписывает transform и облако уезжает к (0,0) — визуально «сзади» головы. */
  return (
    <g transform="translate(52, 20)" aria-hidden>
      {reduceMotion ? (
        blobs
      ) : (
        <motion.g
          animate={{ x: [0, 0.7, -0.5, 0], opacity: [0.88, 1, 0.9, 0.88] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          {blobs}
        </motion.g>
      )}
    </g>
  );
}

/**
 * Надетые пикапы на сперматозоиде (SVG-слои). Метафоры созвучны иконкам на треке, но упрощены и привязаны к телу.
 * Трек: `drawPickupOrObstacle` в `vertical-rush-render.ts`.
 * Omega / лук: щиты рисуются отдельно (`RushOmegaHelmet`, `RushOnionCloud`). Сода — только через sweetStack на глазах.
 */
export function SwimmerRushEquippedLayers(props: { phase: Phase; flags: RushEquippedFlags }) {
  const { phase, flags } = props;

  if (phase === "body") {
    return (
      <g aria-hidden>
        {flags.sugar_cube ? (
          <g>
            <path
              d="M 36 4 L 41 7 L 41 11 L 36 14 L 31 11 L 31 7 Z"
              fill="#f1f5f9"
              stroke="#64748b"
              strokeWidth={0.9}
            />
            <path d="M 36 4 L 41 7 L 36 10 L 31 7 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.6} />
            <path
              d="M 42 6 L 47 9 L 47 13 L 42 16 L 37 13 L 37 9 Z"
              fill="#f8fafc"
              stroke="#64748b"
              strokeWidth={0.85}
              opacity={0.95}
            />
          </g>
        ) : null}
        {flags.zinc ? (
          <g transform="translate(30, 24)">
            <circle cx={0} cy={0} r={2.8} fill="#ecfeff" stroke="#22d3ee" strokeWidth={1} />
            {[0, 90, 180, 270].map((deg) => (
              <line
                key={deg}
                x1={0}
                y1={0}
                x2={0}
                y2={-5}
                stroke="#22d3ee"
                strokeWidth={1.2}
                strokeLinecap="round"
                transform={`rotate(${deg})`}
              />
            ))}
            <line x1={-3} y1={-3} x2={3} y2={3} stroke="rgba(165,243,252,0.95)" strokeWidth={0.9} />
            <line x1={3} y1={-3} x2={-3} y2={3} stroke="rgba(165,243,252,0.95)" strokeWidth={0.9} />
          </g>
        ) : null}
        {flags.garlic ? (
          <g>
            <path d="M 33 26 Q 40 30 47 26" fill="none" stroke="#78716c" strokeWidth={1.1} strokeLinecap="round" />
            <line x1={40} y1={29.5} x2={40} y2={32} stroke="#78716c" strokeWidth={0.95} strokeLinecap="round" />
            <ellipse cx={36.5} cy={34} rx={3.1} ry={3.9} fill="#fefce8" stroke="#a8a29e" strokeWidth={1} />
            <ellipse cx={40} cy={35.5} rx={3.4} ry={4.1} fill="#fef9c3" stroke="#a8a29e" strokeWidth={1} />
            <ellipse cx={43.5} cy={34} rx={3.1} ry={3.9} fill="#fefce8" stroke="#a8a29e" strokeWidth={1} />
            <path d="M 35 30.5 L 34 28" stroke="#c4b5fd" strokeWidth={1.2} strokeLinecap="round" />
            <path d="M 40 31.5 L 40 29" stroke="#c4b5fd" strokeWidth={1.2} strokeLinecap="round" />
            <path d="M 45 30.5 L 46 28" stroke="#c4b5fd" strokeWidth={1.2} strokeLinecap="round" />
          </g>
        ) : null}
        {flags.citrus ? (
          <g transform="translate(51, 20) rotate(-10)">
            <path
              d="M 0 0 L 10.5 1.2 A 11 11 0 0 1 0 11 Z"
              fill="#eab308"
              stroke="#a16207"
              strokeWidth={0.85}
            />
            <line x1={2} y1={2.5} x2={8} y2={5} stroke="rgba(254,243,199,0.9)" strokeWidth={0.55} />
            <line x1={1.5} y1={6} x2={7} y2={8} stroke="rgba(254,243,199,0.8)" strokeWidth={0.5} />
            <circle cx={3.5} cy={4.5} r={1.3} fill="#fef9c3" />
          </g>
        ) : null}
      </g>
    );
  }

  if (phase === "face") {
    return (
      <g aria-hidden>
        {flags.chips ? (
          <g transform="translate(27, 18) rotate(-18)">
            <path
              d="M 0 0 L 6 1 L 3 5 Z"
              fill="#d4a574"
              stroke="#78350f"
              strokeWidth={0.85}
            />
            <path d="M 2 2 L 5 3" stroke="rgba(120,53,15,0.5)" strokeWidth={0.5} />
          </g>
        ) : null}
      </g>
    );
  }

  return (
    <g aria-hidden>
      {flags.fried_ring ? (
        <g transform="translate(47, 27) rotate(8)">
          <circle cx={0} cy={0} r={3.2} fill="#292524" />
          <circle cx={0} cy={0} r={7} fill="none" stroke="#b45309" strokeWidth={3} />
          <path d="M 4 6 Q 6 9 5 11" fill="none" stroke="rgba(245,158,11,0.85)" strokeWidth={1} strokeLinecap="round" />
        </g>
      ) : null}
    </g>
  );
}
