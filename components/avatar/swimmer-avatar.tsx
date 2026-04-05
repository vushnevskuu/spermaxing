"use client";

import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import {
  motion,
  useFollowValue,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Transition,
} from "framer-motion";
import { cn } from "@/lib/utils";
import type { RushEquippedFlags } from "@/lib/vertical-rush-equipped";
import type { ColorTheme, TailType, AuraType, HeadgearId, FaceExtraId, NeckWearId } from "@/types";
import { SwimmerCosmetics } from "@/components/avatar/swimmer-cosmetics";
import { RushOmegaHelmet, RushOnionCloud, SwimmerRushEquippedLayers } from "@/components/avatar/swimmer-rush-equipped";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function lerpHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  if (!A || !B) return a;
  const u = Math.min(1, Math.max(0, t));
  const r = Math.round(A.r + (B.r - A.r) * u);
  const g = Math.round(A.g + (B.g - A.g) * u);
  const bl = Math.round(A.b + (B.b - A.b) * u);
  return `#${[r, g, bl].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/** Fill colors for the cartoon swimmer (abstract character, non-realistic). */
const themeFill: Record<ColorTheme, { main: string; tail: string }> = {
  electric: { main: "#ff8c00", tail: "#c8ff00" },
  magenta: { main: "#ff5722", tail: "#ffcc80" },
  cyan: { main: "#b5e61d", tail: "#f4ffc8" },
  gold: { main: "#fbbf24", tail: "#fef08a" },
  slime: { main: "#84cc16", tail: "#bef264" },
  void: { main: "#64748b", tail: "#cbd5e1" },
};

/** Точка крепления жгутика к «голове» (левая сторона эллипса). */
const ATTACH = { x: 24, y: 22 };
const VIEWBOX = { w: 64, h: 44 };

type WaveParams = {
  segments: number;
  step: number;
  ampMove: number;
  ampIdle: number;
  durMove: number;
  durIdle: number;
  delayPerSeg: number;
  /** Начальный наклон всей цепочки (градусы). */
  baseAngle?: number;
  /** Утолщение базовой линии (paddle и т.п.). */
  strokeBoost?: number;
  /** Пунктир сегментов (например dotted). */
  dashPattern?: string;
};

function waveParams(tailType: TailType): WaveParams {
  switch (tailType) {
    case "fin":
      return {
        segments: 5,
        step: 10,
        ampMove: 25,
        ampIdle: 6.5,
        durMove: 0.4,
        durIdle: 2.95,
        delayPerSeg: 0.044,
        baseAngle: -4,
      };
    case "comet":
      return {
        segments: 4,
        step: 12,
        ampMove: 17,
        ampIdle: 4.8,
        durMove: 0.33,
        durIdle: 2.45,
        delayPerSeg: 0.038,
        baseAngle: -12,
      };
    case "bubble":
      return {
        segments: 6,
        step: 8,
        ampMove: 19,
        ampIdle: 7.5,
        durMove: 0.46,
        durIdle: 3.25,
        delayPerSeg: 0.048,
      };
    case "trail":
      return {
        segments: 7,
        step: 9,
        ampMove: 21,
        ampIdle: 6.8,
        durMove: 0.44,
        durIdle: 3.45,
        delayPerSeg: 0.046,
        baseAngle: 3,
      };
    case "vee":
      return {
        segments: 6,
        step: 9,
        ampMove: 23,
        ampIdle: 7.5,
        durMove: 0.42,
        durIdle: 3.05,
        delayPerSeg: 0.042,
      };
    case "hook":
      return {
        segments: 6,
        step: 9,
        ampMove: 20,
        ampIdle: 6.8,
        durMove: 0.46,
        durIdle: 3.35,
        delayPerSeg: 0.047,
        baseAngle: 8,
      };
    case "corkscrew":
      return {
        segments: 8,
        step: 7,
        ampMove: 24,
        ampIdle: 7,
        durMove: 0.36,
        durIdle: 2.85,
        delayPerSeg: 0.028,
        baseAngle: -2,
      };
    case "paddle":
      return {
        segments: 4,
        step: 11,
        ampMove: 18,
        ampIdle: 5.5,
        durMove: 0.48,
        durIdle: 3.1,
        delayPerSeg: 0.05,
        baseAngle: -6,
        strokeBoost: 1.55,
      };
    case "coil":
      return {
        segments: 7,
        step: 8,
        ampMove: 28,
        ampIdle: 8,
        durMove: 0.34,
        durIdle: 2.7,
        delayPerSeg: 0.032,
        baseAngle: 0,
      };
    case "plume":
      return {
        segments: 8,
        step: 10,
        ampMove: 19,
        ampIdle: 6.2,
        durMove: 0.54,
        durIdle: 3.6,
        delayPerSeg: 0.052,
        baseAngle: 4,
      };
    case "bolt":
      return {
        segments: 5,
        step: 9,
        ampMove: 27,
        ampIdle: 7.5,
        durMove: 0.3,
        durIdle: 2.5,
        delayPerSeg: 0.026,
        baseAngle: -8,
      };
    case "dotted":
      return {
        segments: 6,
        step: 8,
        ampMove: 20,
        ampIdle: 6.5,
        durMove: 0.44,
        durIdle: 3.2,
        delayPerSeg: 0.045,
        dashPattern: "2 6",
        strokeBoost: 1.12,
      };
    case "ribbon":
    default:
      return {
        segments: 7,
        step: 9,
        ampMove: 22,
        ampIdle: 6.8,
        durMove: 0.43,
        durIdle: 3.25,
        delayPerSeg: 0.046,
      };
  }
}

/** Плавная «ось» волны по жгутику (без резких изломов между ключами). */
function rotateWave(amp: number): number[] {
  const a = amp;
  return [
    0,
    a * 0.22,
    a * 0.62,
    a * 0.94,
    a * 0.72,
    a * 0.28,
    -a * 0.38,
    -a * 0.88,
    -a * 0.58,
    -a * 0.2,
    a * 0.32,
    0,
  ];
}

function rotateWaveCorkscrew(amp: number): number[] {
  const a = amp;
  return [
    0,
    a * 0.82,
    -a * 0.78,
    a * 0.74,
    -a * 0.68,
    a * 0.6,
    -a * 0.5,
    a * 0.38,
    -a * 0.24,
    a * 0.12,
    0,
  ];
}

function rotateWaveCoil(amp: number): number[] {
  const a = amp;
  return [
    0,
    -a * 0.32,
    a * 0.52,
    -a * 0.68,
    a * 0.74,
    -a * 0.58,
    a * 0.42,
    -a * 0.22,
    0,
  ];
}

function rotateWavePlume(amp: number): number[] {
  const a = amp * 0.92;
  return [
    0,
    a * 0.06,
    a * 0.22,
    a * 0.48,
    a * 0.7,
    a * 0.62,
    a * 0.35,
    -a * 0.05,
    -a * 0.32,
    -a * 0.52,
    -a * 0.28,
    a * 0.12,
    0,
  ];
}

function rotateWaveBolt(amp: number): number[] {
  const a = amp;
  return [
    0,
    a * 0.12,
    -a * 0.08,
    a * 0.98,
    -a * 0.32,
    a * 0.48,
    -a * 0.9,
    a * 0.44,
    -a * 0.18,
    0,
  ];
}

function tailWaveKeyframes(tailType: TailType, amp: number): number[] {
  switch (tailType) {
    case "corkscrew":
      return rotateWaveCorkscrew(amp);
    case "paddle":
      return rotateWave(amp);
    case "coil":
      return rotateWaveCoil(amp);
    case "plume":
      return rotateWavePlume(amp);
    case "bolt":
      return rotateWaveBolt(amp);
    case "dotted":
      return rotateWave(amp * 0.78);
    default:
      return rotateWave(amp);
  }
}

function TailSegmentChain(props: {
  index: number;
  max: number;
  step: number;
  stroke: string;
  strokeWidth: number;
  rotateDeg: number[];
  duration: number;
  delayPerSeg: number;
  dashPattern?: string;
}): ReactNode {
  const { index, max, step, stroke, strokeWidth, rotateDeg, duration, delayPerSeg, dashPattern } = props;
  if (index >= max) return null;
  const taper = 1 - index * 0.06;
  const sw = Math.max(1.2, strokeWidth * taper);

  const transition: Transition = {
    repeat: Infinity,
    duration,
    ease: [0.45, 0.02, 0.55, 0.98],
    delay: index * delayPerSeg,
  };

  return (
    <motion.g style={{ transformOrigin: "0px 0px" }} animate={{ rotate: rotateDeg }} transition={transition}>
      <line
        x1={0}
        y1={0}
        x2={-step}
        y2={0}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={dashPattern}
      />
      <g transform={`translate(${-step}, 0)`}>
        <TailSegmentChain
          index={index + 1}
          max={max}
          step={step}
          stroke={stroke}
          strokeWidth={strokeWidth}
          rotateDeg={rotateDeg}
          duration={duration}
          delayPerSeg={delayPerSeg}
          dashPattern={dashPattern}
        />
      </g>
    </motion.g>
  );
}

function FlagellumTail(props: {
  tailType: TailType;
  tailColor: string;
  strokeWidth: number;
  moving: boolean;
  referenceLobbyStyle: boolean;
  size: "sm" | "md" | "lg";
  /** Режим цитрусовой кометы: длиннее, ярче волна хвоста. */
  cometBoost?: boolean;
}) {
  const { tailType, tailColor, strokeWidth, moving, referenceLobbyStyle, size, cometBoost = false } = props;
  const p = waveParams(tailType);
  const scale = size === "sm" ? 0.88 : size === "lg" ? 1.12 : 1;
  const step = Math.max(5, Math.round(p.step * scale * 0.94));
  const segs = Math.min(
    10,
    Math.max(4, Math.round(p.segments * (size === "lg" ? 1.03 : size === "sm" ? 0.96 : 1)))
  );

  const ampBoost = cometBoost ? 1.38 : 1;
  const durBoost = cometBoost ? 0.62 : 1;
  const amp = (moving ? p.ampMove : p.ampIdle) * ampBoost;
  const dur =
    (referenceLobbyStyle
      ? moving
        ? p.durMove * 1.08
        : p.durIdle * 0.92
      : moving
        ? p.durMove
        : p.durIdle) * durBoost;

  const rotateDeg = tailWaveKeyframes(tailType, amp);
  const baseW = (strokeWidth + 0.8) * (p.strokeBoost ?? 1) * (cometBoost ? 1.2 : 1);

  return (
    <g transform={`translate(${ATTACH.x}, ${ATTACH.y}) rotate(${p.baseAngle ?? 0})`}>
      <TailSegmentChain
        index={0}
        max={segs}
        step={step}
        stroke={tailColor}
        strokeWidth={baseW}
        rotateDeg={rotateDeg}
        duration={dur}
        delayPerSeg={p.delayPerSeg}
        dashPattern={p.dashPattern}
      />
    </g>
  );
}

/** Движение «головы» при плавании: вперёд–назад и лёгкий наклон, как у плывущей клетки. */
function bodySwimMotion(moving: boolean): { animate: Record<string, number[]>; transition: Transition } {
  if (moving) {
    return {
      animate: {
        x: [0, 1.4, -1, 0.9, -0.6, 0],
        y: [0, -1.1, 0.8, -0.6, 0.4, 0],
        rotate: [0, -4.2, 3.4, -2.8, 2.2, 0],
      },
      transition: {
        repeat: Infinity,
        duration: 0.64,
        ease: [0.42, 0, 0.58, 1],
      },
    };
  }
  return {
    animate: {
      x: [0, 0.45, -0.35, 0.25, 0],
      y: [0, -0.4, 0.3, -0.22, 0],
      rotate: [0, 1.6, -1.3, 0.9, 0],
    },
    transition: {
      repeat: Infinity,
      duration: 3.45,
      ease: [0.45, 0.05, 0.55, 0.95],
    },
  };
}

function flatAuraClass(aura: AuraType): string {
  switch (aura) {
    case "pulse":
      return "bg-accent-2/15";
    case "rings":
      return "border-2 border-dashed border-primary/55 bg-transparent";
    case "spark":
      return "bg-amber-400/20";
    default:
      return "";
  }
}

export function SwimmerAvatar(props: {
  colorTheme: ColorTheme;
  tailType: TailType;
  auraEffect: AuraType;
  headgear?: HeadgearId;
  faceExtra?: FaceExtraId;
  neckWear?: NeckWearId;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
  /** Degrees; 0 = facing right (screen +x). */
  facingDeg?: number;
  /** Активное плавание — усиленная волна жгутика и тело. */
  moving?: boolean;
  /** Microscope / reference lobby: pale translucent swimmer toward the egg. */
  referenceLobbyStyle?: boolean;
  /**
   * Vertical rush: что уже «надето» на персонаже после пикапа.
   * Иконка на треке рисуется отдельно (`drawPickupOrObstacle` в `vertical-rush-render`).
   */
  rushEquipped?: RushEquippedFlags | null;
  /** Vertical rush: candy/soda/sugar — крупнее белки глаз и быстрее зрачки. */
  rushSweetStack?: number;
  /** Vertical rush: активен луковый щит (зелёное облако впереди головы). */
  rushOnionCloud?: boolean;
  /** Vertical rush: заряды омега-пузыря (жёлтый шлем). */
  rushOmegaCharges?: number;
  /** Vertical rush: собрано цинка 0–5 — лицо сереет, скорость в логике игры. */
  rushZincCount?: number;
  /** Vertical rush: режим цитрусовой кометы (оранжевый + хвост-комета). */
  rushCitrusComet?: boolean;
}) {
  const {
    colorTheme,
    tailType,
    auraEffect,
    headgear = "none",
    faceExtra = "none",
    neckWear = "none",
    size = "md",
    className,
    label,
    facingDeg = 0,
    moving = false,
    referenceLobbyStyle = false,
    rushEquipped = null,
    rushSweetStack = 0,
    rushOnionCloud = false,
    rushOmegaCharges = 0,
    rushZincCount = 0,
    rushCitrusComet = false,
  } = props;
  const baseTheme = themeFill[colorTheme];
  const grayTarget = { main: "#64748b", tail: "#94a3b8" };
  const cometFill = { main: "#ea580c", tail: "#fdba74" };
  const zincT = referenceLobbyStyle ? 0 : Math.min(Math.max(0, rushZincCount), 5) / 5;
  const fill = referenceLobbyStyle
    ? { main: "rgba(255,255,255,0.72)", tail: "rgba(255,255,255,0.55)" }
    : rushCitrusComet
      ? cometFill
      : {
          main: lerpHex(baseTheme.main, grayTarget.main, zincT * 0.88),
          tail: lerpHex(baseTheme.tail, grayTarget.tail, zincT * 0.85),
        };
  const showAura = !referenceLobbyStyle && auraEffect !== "none";
  const w = size === "sm" ? 48 : size === "lg" ? 88 : 64;
  const h = size === "sm" ? 34 : size === "lg" ? 62 : 46;
  const stroke = 2.5;

  const bodyMotion = bodySwimMotion(moving);
  const reduceMotion = useReducedMotion() === true;

  const sweetN = referenceLobbyStyle ? 0 : Math.min(Math.max(0, rushSweetStack), 10);
  const eyeRx = 5 + sweetN * 0.48;
  const eyeRy = 6 + sweetN * 0.42;
  const pupilLo = 2.2;
  const pupilHi = Math.min(4.45, 2.2 + sweetN * 0.3);
  const pupilDur = Math.max(0.085, 0.56 / (1 + sweetN * 0.26));
  const sugarRushEyes = sweetN > 0;

  /**
   * Инерция хвоста: tween к facing без перерегулирования пружины (она «дрожит» при скачущей цели).
   * При prefers-reduced-motion — без отставания.
   */
  const facingTarget = useMotionValue(facingDeg);
  useLayoutEffect(() => {
    facingTarget.set(facingDeg);
  }, [facingDeg, facingTarget]);
  const tailSmoothedFacing = useFollowValue(facingTarget, {
    type: "tween",
    duration: reduceMotion ? 0 : 0.11,
    ease: [0.25, 0.1, 0.25, 1],
  });
  const tailLagDeg = useTransform([tailSmoothedFacing, facingTarget], ([s, f]: number[]) =>
    reduceMotion ? 0 : s - f
  );

  return (
    <div className={cn("relative flex flex-col items-center overflow-visible", className)}>
      {referenceLobbyStyle ? (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-[42%] z-0 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30 blur-2xl"
          animate={{ opacity: [0.45, 0.72, 0.45], scale: [0.96, 1.04, 0.96] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
          aria-hidden
        />
      ) : null}
      {showAura && (
        <motion.div
          className={cn(
            "pointer-events-none absolute inset-0 scale-150 rounded-full blur-md",
            flatAuraClass(auraEffect)
          )}
          animate={
            auraEffect === "pulse"
              ? { scale: [1, 1.08, 1], opacity: [0.45, 0.7, 0.45] }
              : auraEffect === "rings"
                ? { rotate: [0, 360] }
                : { y: [0, -2, 0] }
          }
          transition={{ repeat: Infinity, duration: auraEffect === "rings" ? 6 : 1.6 }}
        />
      )}
      <div
        className="relative z-10 origin-center will-change-transform"
        style={{ transform: `rotate(${facingDeg}deg)` }}
      >
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
          overflow="visible"
          className={
            referenceLobbyStyle
              ? "opacity-[0.78] [filter:drop-shadow(0_0_10px_rgba(255,255,255,0.55))_drop-shadow(0_0_20px_rgba(255,255,255,0.25))]"
              : "drop-shadow-[0_3px_0_rgba(0,0,0,0.25)]"
          }
          aria-hidden
        >
          {/* Жгутик: % origin + view-box — иначе при width/height ≠ viewBox CSS-поворот рвёт крепление */}
          <motion.g
            style={{
              transformBox: "view-box",
              transformOrigin: `${(ATTACH.x / VIEWBOX.w) * 100}% ${(ATTACH.y / VIEWBOX.h) * 100}%`,
              rotate: tailLagDeg,
            }}
          >
            <FlagellumTail
              tailType={tailType}
              tailColor={fill.tail}
              strokeWidth={stroke}
              moving={moving}
              referenceLobbyStyle={referenceLobbyStyle}
              size={size}
              cometBoost={rushCitrusComet && !referenceLobbyStyle}
            />
          </motion.g>

          {/* Голова: микродвижения плавания (общий facing — на обёртке div) */}
          <motion.g
            animate={bodyMotion.animate}
            transition={
              referenceLobbyStyle
                ? {
                    ...bodyMotion.transition,
                    duration: Number(bodyMotion.transition.duration ?? 0.55) * (moving ? 1.06 : 0.88),
                  }
                : bodyMotion.transition
            }
            style={{ transformOrigin: "40px 22px" }}
          >
            <SwimmerCosmetics
              phase="behind"
              headgear={headgear}
              faceExtra={faceExtra}
              neckWear={neckWear}
              accent={fill.main}
              referenceLobbyStyle={referenceLobbyStyle}
            />
            <ellipse
              cx="40"
              cy="22"
              rx="17"
              ry="14"
              fill={fill.main}
              stroke={referenceLobbyStyle ? "rgba(200,230,255,0.5)" : "#fff"}
              strokeWidth={stroke}
            />
            {!referenceLobbyStyle && rushOmegaCharges > 0 && !rushCitrusComet ? (
              <RushOmegaHelmet charges={rushOmegaCharges} reduceMotion={reduceMotion} />
            ) : null}
            {!referenceLobbyStyle && rushEquipped ? (
              <SwimmerRushEquippedLayers phase="body" flags={rushEquipped} />
            ) : null}
            <ellipse cx="34" cy="19" rx={eyeRx} ry={eyeRy} fill="#fff" />
            <ellipse cx="48" cy="19" rx={eyeRx} ry={eyeRy} fill="#fff" />
            {!referenceLobbyStyle && rushEquipped ? (
              <SwimmerRushEquippedLayers phase="face" flags={rushEquipped} />
            ) : null}
            {rushEquipped?.candy && !referenceLobbyStyle ? (
              <>
                {reduceMotion ? (
                  <>
                    <circle cx="35" cy="19" r={pupilLo} fill="#0f172a" />
                    <circle cx="49" cy="19" r={pupilLo} fill="#0f172a" />
                  </>
                ) : (
                  <>
                    <motion.circle
                      cx="35"
                      cy="19"
                      r={pupilLo}
                      fill="#0f172a"
                      animate={{ r: [pupilLo, pupilHi, pupilLo] }}
                      transition={{ repeat: Infinity, duration: pupilDur, ease: [0.45, 0, 0.55, 1] }}
                    />
                    <motion.circle
                      cx="49"
                      cy="19"
                      r={pupilLo}
                      fill="#0f172a"
                      animate={{ r: [pupilHi, pupilLo, pupilHi] }}
                      transition={{ repeat: Infinity, duration: pupilDur, ease: [0.45, 0, 0.55, 1] }}
                    />
                  </>
                )}
                <path
                  d="M 32 24 Q 34 22 40 23 Q 46 22 50 24 Q 51 28 48 31 Q 42 33 40 32 Q 38 33 32 31 Q 29 28 32 24 Z"
                  fill="#3d2a1f"
                  stroke="#271a12"
                  strokeWidth={0.9}
                  opacity={0.92}
                />
                <path
                  d="M 38 30 Q 39 34 38 36 M 42 31 Q 41 35 42 37"
                  fill="none"
                  stroke="#271a12"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  opacity={0.75}
                />
              </>
            ) : sugarRushEyes && !referenceLobbyStyle ? (
              reduceMotion ? (
                <>
                  <circle cx="35" cy="19" r={pupilLo} fill="#0f172a" />
                  <circle cx="49" cy="19" r={pupilLo} fill="#0f172a" />
                  <path
                    d="M 36 27 Q 42 31 48 27"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity={0.55}
                  />
                </>
              ) : (
                <>
                  <motion.circle
                    cx="35"
                    cy="19"
                    r={pupilLo}
                    fill="#0f172a"
                    animate={{ r: [pupilLo, pupilHi, pupilLo] }}
                    transition={{ repeat: Infinity, duration: pupilDur, ease: [0.45, 0, 0.55, 1] }}
                  />
                  <motion.circle
                    cx="49"
                    cy="19"
                    r={pupilLo}
                    fill="#0f172a"
                    animate={{ r: [pupilHi, pupilLo, pupilHi] }}
                    transition={{ repeat: Infinity, duration: pupilDur, ease: [0.45, 0, 0.55, 1] }}
                  />
                  <path
                    d="M 36 27 Q 42 31 48 27"
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity={0.55}
                  />
                </>
              )
            ) : (
              <>
                <circle cx="35" cy="19" r="2.2" fill="#0f172a" />
                <circle cx="49" cy="19" r="2.2" fill="#0f172a" />
                <path
                  d="M 36 27 Q 42 31 48 27"
                  fill="none"
                  stroke={referenceLobbyStyle ? "rgba(226,232,240,0.65)" : "#0f172a"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity={0.55}
                />
              </>
            )}
            {!referenceLobbyStyle && rushOnionCloud && !rushCitrusComet ? (
              <RushOnionCloud active reduceMotion={reduceMotion} />
            ) : null}
            {!referenceLobbyStyle && rushEquipped ? (
              <SwimmerRushEquippedLayers phase="mouthCorner" flags={rushEquipped} />
            ) : null}
            <SwimmerCosmetics
              phase="front"
              headgear={headgear}
              faceExtra={faceExtra}
              neckWear={neckWear}
              accent={fill.main}
              referenceLobbyStyle={referenceLobbyStyle}
            />
          </motion.g>
        </svg>
      </div>
      {label ? (
        <span
          className={cn(
            "mt-0.5 max-w-[104px] truncate rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
            referenceLobbyStyle
              ? "border bg-black/50 text-primary"
              : "border border-zinc-600 bg-zinc-800 text-zinc-200"
          )}
          style={
            referenceLobbyStyle
              ? { borderColor: "rgba(69,162,158,0.55)" }
              : undefined
          }
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
