/**
 * Procedural OVUM-style climb art: neon tunnel, readable pickups (no external bitmaps).
 * Иконки на треке — здесь (`drawPickupOrObstacle`). После подбора на персонаже — `SwimmerRushEquippedLayers` / `RushEquippedFlags`.
 */

import { BAD_ITEMS, GOOD_ITEMS, OBSTACLES, type BadId, type GoodId, type ObstacleId } from "@/lib/vertical-rush-catalog";

const TAU = Math.PI * 2;

function catalogColor(kind: "good" | "bad" | "obs", id: GoodId | BadId | ObstacleId): string {
  if (kind === "good") return GOOD_ITEMS.find((g) => g.id === id)?.color ?? "#67e8f9";
  if (kind === "bad") return BAD_ITEMS.find((b) => b.id === id)?.color ?? "#f472b6";
  return OBSTACLES.find((o) => o.id === id)?.color ?? "#94a3b8";
}

function drawItemAura(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, r: number, alpha: number) {
  const hex = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!hex) return;
  const n = parseInt(hex[1], 16);
  const rr = (n >> 16) & 255;
  const gg = (n >> 8) & 255;
  const bb = n & 255;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, `rgba(${rr},${gg},${bb},${alpha * 0.9})`);
  g.addColorStop(0.5, `rgba(${rr},${gg},${bb},${alpha * 0.22})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
}

function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/** OVUM climb tunnel: neon ovum-field, parallax grid, soft “flow” curves (cartoon, non-explicit). */
export function drawVerticalRushBackground(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  scroll: number,
  nowMs: number
) {
  const g0 = ctx.createLinearGradient(0, 0, 0, H);
  g0.addColorStop(0, "#1e0b3a");
  g0.addColorStop(0.38, "#12061f");
  g0.addColorStop(0.72, "#070212");
  g0.addColorStop(1, "#020105");
  ctx.fillStyle = g0;
  ctx.fillRect(0, 0, W, H);

  const rg = ctx.createRadialGradient(W * 0.5, H * 0.08, 0, W * 0.5, H * 0.12, H * 0.55);
  rg.addColorStop(0, "rgba(250, 204, 21, 0.14)");
  rg.addColorStop(0.35, "rgba(168, 85, 247, 0.08)");
  rg.addColorStop(0.7, "rgba(34, 211, 238, 0.04)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);

  const side = ctx.createLinearGradient(0, 0, W, 0);
  side.addColorStop(0, "rgba(34, 211, 238, 0.07)");
  side.addColorStop(0.12, "rgba(0,0,0,0)");
  side.addColorStop(0.88, "rgba(0,0,0,0)");
  side.addColorStop(1, "rgba(192, 132, 252, 0.07)");
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, W, H);

  const flow = (scroll * 0.22 + nowMs * 0.018) % 140;
  ctx.strokeStyle = "rgba(168, 85, 247, 0.11)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (let i = -2; i < 6; i++) {
    const y0 = i * 140 - flow;
    ctx.beginPath();
    ctx.moveTo(-20, y0);
    ctx.bezierCurveTo(W * 0.35, y0 + 50, W * 0.65, y0 - 30, W + 20, y0 + 70);
    ctx.stroke();
  }

  const drift = (scroll * 0.42 + nowMs * 0.025) % 28;
  ctx.strokeStyle = "rgba(34, 211, 238, 0.055)";
  ctx.lineWidth = 1;
  for (let y = -drift; y < H + 28; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.028)";
  for (let x = 0; x < W; x += 22) {
    const skew = scroll * 0.08 + x * 0.04;
    ctx.beginPath();
    ctx.moveTo(x + (skew % 16), 0);
    ctx.lineTo(x + 36 + (skew % 16), H);
    ctx.stroke();
  }

  const vg = ctx.createRadialGradient(W * 0.5, H * 0.92, 10, W * 0.5, H * 0.92, H * 0.65);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

/** Ground glow under the HTML SwimmerAvatar (reads as “hover” in the tunnel). */
export function drawPlayerGroundGlow(ctx: CanvasRenderingContext2D, px: number, py: number, nowMs: number) {
  const pulse = 0.85 + Math.sin(nowMs * 0.006) * 0.12;
  const g = ctx.createRadialGradient(px, py + 6, 0, px, py + 6, 38 * pulse);
  g.addColorStop(0, "rgba(34, 211, 238, 0.35)");
  g.addColorStop(0.35, "rgba(168, 85, 247, 0.2)");
  g.addColorStop(0.65, "rgba(250, 204, 21, 0.08)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(px, py + 8, 32 * pulse, 14 * pulse, 0, 0, TAU);
  ctx.fill();
}

/** Оранжевый шлейф «кометы» под игроком (режим Citrus). */
export function drawCitrusCometTrail(ctx: CanvasRenderingContext2D, px: number, py: number, nowMs: number) {
  const t = nowMs * 0.007;
  for (let i = 0; i < 6; i++) {
    const oy = 10 + i * 13 + Math.sin(t + i * 0.7) * 5;
    const ox = Math.sin(t * 0.55 + i * 1.1) * 8;
    const alpha = Math.max(0.08, 0.5 - i * 0.065);
    const r = 22 - i * 2.8;
    const g = ctx.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r);
    g.addColorStop(0, `rgba(253, 186, 116, ${alpha})`);
    g.addColorStop(0.45, `rgba(249, 115, 22, ${alpha * 0.55})`);
    g.addColorStop(1, "rgba(234, 88, 12, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(px + ox, py + oy, r, r * 0.55, Math.sin(t + i) * 0.15, 0, TAU);
    ctx.fill();
  }
  const pulse = 0.9 + Math.sin(nowMs * 0.014) * 0.1;
  const core = ctx.createRadialGradient(px, py + 4, 0, px, py + 4, 36 * pulse);
  core.addColorStop(0, "rgba(254, 215, 170, 0.55)");
  core.addColorStop(0.4, "rgba(251, 146, 60, 0.35)");
  core.addColorStop(1, "rgba(234, 88, 12, 0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(px, py + 6, 30 * pulse, 13 * pulse, 0, 0, TAU);
  ctx.fill();
}

/**
 * NPC swimmer swimming down-track (head toward player). Cartoon, non-explicit.
 */
export function drawRivalSwimmer(ctx: CanvasRenderingContext2D, cx: number, cy: number, nowMs: number) {
  const t = nowMs * 0.0035;
  const wob = Math.sin(t * 1.1) * 1.8;
  ctx.save();
  ctx.translate(cx, cy + wob);
  ctx.strokeStyle = "rgba(251, 113, 133, 0.55)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#94a3b8";
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, 9, 15, 12, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.arc(-5, 6, 4, 0, TAU);
  ctx.arc(6, 6, 4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(-4.5, 6.5, 1.6, 0, TAU);
  ctx.arc(6.5, 6.5, 1.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#cbd5e1";
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.quadraticCurveTo(22 + Math.sin(t * 1.4) * 3, -18, 28, -6);
  ctx.quadraticCurveTo(14, 2, 0, -4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Mineral sparkle: 4 long rays + short diagonal glints (reads as “pickup buff”). */
function drawGoodZinc(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const s = 1 + Math.sin(t) * 0.05;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.4) * 0.12);
  ctx.scale(s, s);
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -13);
    ctx.stroke();
    ctx.rotate(Math.PI / 2);
  }
  ctx.fillStyle = "#ecfeff";
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#67e8f9";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = "rgba(165,243,252,0.9)";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(-5, -5);
  ctx.lineTo(5, 5);
  ctx.moveTo(5, -5);
  ctx.lineTo(-5, 5);
  ctx.stroke();
  ctx.restore();
}

/** Softgel capsule (omega-3 read) + tiny Ω curve on body. */
function drawGoodOmega(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.5) * 0.1);
  ctx.fillStyle = "#7dd3fc";
  ctx.strokeStyle = "#0284c7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 14, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-4, -3);
  ctx.bezierCurveTo(-1, -7, 1, -7, 4, -3);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(-2, 2, 2.5, 4, -0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Garlic bulb: wide base + 5 rounded cloves on top. */
function drawGoodGarlic(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.7) * 0.06);
  ctx.fillStyle = "#fefce8";
  ctx.strokeStyle = "#ca8a04";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.bezierCurveTo(-12, 10, -12, -2, -8, -8);
  ctx.bezierCurveTo(-4, -14, 4, -14, 8, -8);
  ctx.bezierCurveTo(12, -2, 12, 10, 0, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  for (let i = -2; i <= 2; i++) {
    ctx.fillStyle = i === 0 ? "#fef08a" : "#fde047";
    ctx.beginPath();
    ctx.arc(i * 4.5, -10, 3.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

/** Donut: thick torus + dark hole (not a filled disc). */
function drawGoodOnionRing(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.35);
  ctx.fillStyle = "#1a0a0a";
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = "#a16207";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.arc(0, 0, 7.5, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/** Orange slice: semicircle with segment lines from center. */
function drawGoodCitrus(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t) * 0.12);
  ctx.fillStyle = "#eab308";
  ctx.strokeStyle = "#a16207";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0.15 * Math.PI, 0.85 * Math.PI, false);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(254,243,199,0.85)";
  ctx.lineWidth = 1.25;
  for (let i = 1; i <= 4; i++) {
    const a = 0.15 * Math.PI + (i / 5) * 0.7 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
    ctx.stroke();
  }
  ctx.fillStyle = "#fef9c3";
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Crisp bag + chips sticking out of top. */
function drawBadChips(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.08 + Math.sin(t) * 0.04);
  ctx.fillStyle = "#c4a574";
  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, 10);
  ctx.lineTo(-10, -6);
  ctx.lineTo(-6, -10);
  ctx.lineTo(6, -10);
  ctx.lineTo(10, -6);
  ctx.lineTo(12, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#d4a574";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(-4 + i * 4, -12 - (i % 2), 3.5, 2.2, (i - 1) * 0.3, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(120,53,15,0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.lineTo(6, 5);
  ctx.stroke();
  ctx.restore();
}

/** Wrapped candy: twisted paper ends + round center. */
function drawBadCandy(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.35);
  ctx.fillStyle = "#fbcfe8";
  ctx.strokeStyle = "#9d174d";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(-10, -5);
  ctx.lineTo(-10, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(10, -5);
  ctx.lineTo(10, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f472b6";
  ctx.strokeStyle = "#be185d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(-2, -2, 2.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Takeaway cup + lid + straw + bubbles. */
function drawBadSoda(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#0ea5e9";
  ctx.strokeStyle = "#075985";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-9, 10);
  ctx.lineTo(-7, -4);
  ctx.lineTo(7, -4);
  ctx.lineTo(9, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e0f2fe";
  ctx.beginPath();
  ctx.ellipse(0, -4, 9, 2.8, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(5, -5);
  ctx.lineTo(8 + Math.sin(t) * 1.5, -18);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  for (let i = 0; i < 3; i++) {
    const oy = Math.sin(t * 2 + i) * 1.5;
    ctx.beginPath();
    ctx.arc(-3 + i * 3, 1 + oy, 1.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** Fried ring: darker donut + grease drip + crackle. */
function drawBadFriedRing(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.15 + Math.sin(t * 0.85) * 0.08);
  ctx.fillStyle = "#292524";
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#b45309";
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 1.25;
  ctx.stroke();
  ctx.strokeStyle = "rgba(69,26,3,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(6, 8);
  ctx.quadraticCurveTo(8, 12, 7, 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-8, 3);
  ctx.lineTo(-5, 5);
  ctx.moveTo(4, -6);
  ctx.lineTo(7, -4);
  ctx.stroke();
  ctx.restore();
}

/** Isometric cube: three visible faces. */
function drawBadSugarCube(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  const s = 1 + Math.sin(t * 1.2) * 0.03;
  ctx.scale(s, s);
  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 1.75;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(11, -2);
  ctx.lineTo(11, 8);
  ctx.lineTo(0, 14);
  ctx.lineTo(-11, 8);
  ctx.lineTo(-11, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(11, -2);
  ctx.lineTo(0, 4);
  ctx.lineTo(-11, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#94a3b8";
  ctx.stroke();
  ctx.fillStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(11, 8);
  ctx.lineTo(0, 14);
  ctx.lineTo(-11, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Laptop: screen + hinge gap + keyboard deck (clear silhouette). */
function drawObsLaptop(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#1e293b";
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  strokeRoundRect(ctx, -15, -14, 30, 20, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#22d3ee";
  ctx.globalAlpha = 0.4 + Math.sin(t * 2) * 0.08;
  ctx.fillRect(-11, -10, 22, 12);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.moveTo(-22, 8);
  ctx.lineTo(22, 8);
  ctx.lineTo(20, 14);
  ctx.lineTo(-20, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 7, 10);
    ctx.lineTo(i * 7 + 4, 10);
    ctx.stroke();
  }
  ctx.restore();
}

/** Shower head arc + dotted spray. */
function drawObsShower(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, -8, 12, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.fillStyle = "#64748b";
  for (let a = 0.25 * Math.PI; a <= 0.75 * Math.PI; a += 0.12) {
    const hx = Math.cos(a) * 12;
    const hy = -8 + Math.sin(a) * 12;
    ctx.beginPath();
    ctx.arc(hx, hy, 1.1, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "#38bdf8";
  for (let i = -3; i <= 3; i++) {
    const ph = (t * 3.2 + i * 0.7) % 3.5;
    ctx.globalAlpha = 0.35 + ph * 0.15;
    ctx.beginPath();
    ctx.arc(i * 4.2, -2 + ph * 9, 1.6, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Belt strap horizontal + rectangular buckle. */
function drawObsBelt(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x + Math.sin(t) * 0.5, y);
  ctx.fillStyle = "#44403c";
  ctx.fillRect(-20, -4, 40, 8);
  ctx.strokeStyle = "#1c1917";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-20, -4, 40, 8);
  ctx.fillStyle = "#a8a29e";
  ctx.strokeStyle = "#292524";
  ctx.lineWidth = 1.5;
  strokeRoundRect(ctx, -7, -6, 14, 12, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#57534e";
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#78716c";
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(-9, 0);
  ctx.moveTo(9, 0);
  ctx.lineTo(18, 0);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/** Tight knot ball (interleaved loops). */
function drawObsStress(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.8) * 0.08);
  ctx.strokeStyle = "#7e22ce";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 6, (i * Math.PI) / 3, 0, TAU);
    ctx.stroke();
  }
  ctx.strokeStyle = "#c084fc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/** Wind gust curves + dust motes. */
function drawObsDryWind(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#d6d3d1";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  const o = (t * 28) % 20;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-14 + o * 0.3, -8 + i * 8);
    ctx.bezierCurveTo(-4 + o * 0.2, -10 + i * 8, 4, -4 + i * 8, 14 + o * 0.15, -6 + i * 8);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(168,162,158,0.75)";
  for (let i = 0; i < 6; i++) {
    const px = ((i * 17 + o * 2) % 26) - 13;
    const py = ((i * 23) % 18) - 9;
    ctx.beginPath();
    ctx.arc(px, py, 1.1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawPickupOrObstacle(
  ctx: CanvasRenderingContext2D,
  kind: "good" | "bad" | "obs",
  id: GoodId | BadId | ObstacleId,
  cx: number,
  cy: number,
  nowMs: number
) {
  const t = nowMs * 0.003;
  const accent = catalogColor(kind, id);
  drawItemAura(ctx, cx, cy, accent, kind === "obs" ? 36 : 32, kind === "good" ? 0.42 : kind === "bad" ? 0.38 : 0.32);

  if (kind === "good") {
    switch (id as GoodId) {
      case "zinc":
        drawGoodZinc(ctx, cx, cy, t);
        break;
      case "omega":
        drawGoodOmega(ctx, cx, cy, t);
        break;
      case "garlic":
        drawGoodGarlic(ctx, cx, cy, t);
        break;
      case "onion_ring":
        drawGoodOnionRing(ctx, cx, cy, t);
        break;
      case "citrus":
        drawGoodCitrus(ctx, cx, cy, t);
        break;
    }
    ctx.strokeStyle = "rgba(34,211,238,0.75)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(34,211,238,0.55)";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, TAU);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(250, 250, 255, 0.35)";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, TAU);
    ctx.stroke();
    return;
  }
  if (kind === "bad") {
    switch (id as BadId) {
      case "chips":
        drawBadChips(ctx, cx, cy, t);
        break;
      case "candy":
        drawBadCandy(ctx, cx, cy, t);
        break;
      case "soda":
        drawBadSoda(ctx, cx, cy, t);
        break;
      case "fried_ring":
        drawBadFriedRing(ctx, cx, cy, t);
        break;
      case "sugar_cube":
        drawBadSugarCube(ctx, cx, cy, t);
        break;
    }
    ctx.strokeStyle = "rgba(244,114,182,0.65)";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "rgba(244,114,182,0.4)";
    ctx.shadowBlur = 8;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, TAU);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(251, 113, 133, 0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  switch (id as ObstacleId) {
    case "laptop":
      drawObsLaptop(ctx, cx, cy, t);
      break;
    case "shower":
      drawObsShower(ctx, cx, cy, t);
      break;
    case "belt":
      drawObsBelt(ctx, cx, cy, t);
      break;
    case "stress":
      drawObsStress(ctx, cx, cy, t);
      break;
    case "dry_wind":
      drawObsDryWind(ctx, cx, cy, t);
      break;
  }
  ctx.strokeStyle = "rgba(248,113,113,0.85)";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "rgba(239, 68, 68, 0.45)";
  ctx.shadowBlur = 12;
  strokeRoundRect(ctx, cx - 27, cy - 23, 54, 46, 6);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(254, 202, 202, 0.4)";
  ctx.lineWidth = 1.25;
  strokeRoundRect(ctx, cx - 24, cy - 20, 48, 40, 4);
  ctx.stroke();
}

export function drawProjectile(ctx: CanvasRenderingContext2D, cx: number, cy: number, nowMs: number) {
  const pulse = 0.8 + Math.sin(nowMs * 0.02) * 0.2;
  ctx.fillStyle = "#fde047";
  ctx.shadowColor = "#facc15";
  ctx.shadowBlur = 8 * pulse;
  ctx.beginPath();
  ctx.arc(cx, cy, 5 * pulse, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fffbeb";
  ctx.beginPath();
  ctx.arc(cx - 1, cy - 1, 2, 0, TAU);
  ctx.fill();
}
