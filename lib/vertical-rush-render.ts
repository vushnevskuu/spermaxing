/**
 * Procedural “LCD / Nokia plane” style sprites — no external assets.
 */

import type { BadId, GoodId, ObstacleId } from "@/lib/vertical-rush-catalog";

const TAU = Math.PI * 2;

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

/** Scrolling retro grid + vignette */
export function drawVerticalRushBackground(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  scroll: number,
  nowMs: number
) {
  /* Slightly lifted from pure black so WebKit/flex layouts never read as “broken / empty”. */
  const top = "#1a0d3d";
  const mid = "#1a1030";
  const bot = "#0c0818";
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(0.45, mid);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const drift = (scroll * 0.35 + nowMs * 0.02) % 24;
  ctx.strokeStyle = "rgba(34,211,238,0.06)";
  ctx.lineWidth = 1;
  for (let y = -drift; y < H + 24; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(168,85,247,0.04)";
  for (let x = 0; x < W; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 40, H);
    ctx.stroke();
  }

  const pulse = 0.5 + Math.sin(nowMs * 0.004) * 0.08;
  ctx.fillStyle = `rgba(250, 204, 21, ${0.03 * pulse})`;
  ctx.fillRect(0, 0, W, H * 0.22);
}

export function drawLaneDividers(ctx: CanvasRenderingContext2D, W: number, H: number, lanes: number, nowMs: number) {
  const dash = 10 + (nowMs * 0.01) % 6;
  for (let L = 1; L < lanes; L++) {
    const x = L * (W / lanes);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 2;
    ctx.setLineDash([dash, 8]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/** Swimmer “plane” facing up — cartoon, non-explicit */
export function drawPlayerSwimmer(ctx: CanvasRenderingContext2D, px: number, py: number, nowMs: number) {
  const wob = Math.sin(nowMs * 0.012) * 2;
  const tail = Math.sin(nowMs * 0.018) * 4;

  ctx.save();
  ctx.translate(px, py + wob);

  ctx.fillStyle = "#1e1b4b";
  ctx.strokeStyle = "#7c3aed";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, -2, 16, 20, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fef08a";
  ctx.beginPath();
  ctx.arc(-6, -10, 3.5, 0, TAU);
  ctx.arc(7, -10, 3.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(-5.5, -9.5, 1.4, 0, TAU);
  ctx.arc(7.5, -9.5, 1.4, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "#4ade80";
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.quadraticCurveTo(-26 + tail, 28, -38 + tail * 0.5, 12);
  ctx.quadraticCurveTo(-16, 18, 0, 6);
  ctx.fill();
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgba(192,132,252,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, -2, 22, 26, 0, 0, TAU);
  ctx.fill();

  ctx.restore();
}

function drawGoodZinc(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const s = 1 + Math.sin(t) * 0.06;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = "#a5f3fc";
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(10, 0);
  ctx.lineTo(0, 12);
  ctx.lineTo(-10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ecfeff";
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawGoodOmega(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  const o = Math.sin(t * 1.2) * 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const yy = -6 + i * 6 + o;
    ctx.moveTo(-12, yy);
    ctx.quadraticCurveTo(-4, yy - 4, 0, yy);
    ctx.quadraticCurveTo(4, yy + 4, 12, yy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGoodGarlic(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.8) * 0.08);
  ctx.fillStyle = "#fef9c3";
  ctx.strokeStyle = "#eab308";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 2, 10, 12, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  for (let i = -1; i <= 1; i++) {
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.moveTo(i * 5, -8);
    ctx.lineTo(i * 5 + 2, -18);
    ctx.lineTo(i * 5 - 2, -18);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawGoodOnionRing(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.4);
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "#ca8a04";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(254,240,138,0.4)";
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawGoodCitrus(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t) * 0.15);
  ctx.fillStyle = "#bef264";
  ctx.strokeStyle = "#65a30d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 14, -0.4, Math.PI * 0.6, false);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ecfccb";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(10, -4);
  ctx.lineTo(4, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBadChips(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.25 + Math.sin(t) * 0.05);
  ctx.fillStyle = "#d4a574";
  ctx.strokeStyle = "#92400e";
  ctx.lineWidth = 2;
  strokeRoundRect(ctx, -14, -8, 28, 16, 3);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(120,53,15,0.5)";
  ctx.lineWidth = 1;
  for (let i = -8; i <= 8; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, -6);
    ctx.lineTo(i + 2, 6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBadCandy(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.5);
  ctx.fillStyle = "#f472b6";
  ctx.strokeStyle = "#db2777";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#fbcfe8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0.2, Math.PI * 1.2);
  ctx.stroke();
  ctx.restore();
}

function drawBadSoda(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#0ea5e9";
  ctx.strokeStyle = "#0369a1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, -14);
  ctx.lineTo(8, -14);
  ctx.lineTo(10, 12);
  ctx.lineTo(-10, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(-4, -6, 3, 14);
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(4 + Math.sin(t) * 2, -22);
  ctx.stroke();
  ctx.restore();
}

function drawBadFriedRing(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.2 + Math.sin(t * 0.9) * 0.1);
  ctx.fillStyle = "#eab308";
  ctx.strokeStyle = "#a16207";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "#713f12";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = "rgba(253,224,71,0.5)";
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawBadSugarCube(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  const s = 1 + Math.sin(t * 1.4) * 0.04;
  ctx.scale(s, s);
  ctx.fillStyle = "#f1f5f9";
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(12, -4);
  ctx.lineTo(12, 8);
  ctx.lineTo(0, 14);
  ctx.lineTo(-12, 8);
  ctx.lineTo(-12, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(148,163,184,0.6)";
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(0, 14);
  ctx.moveTo(-12, -4);
  ctx.lineTo(12, -4);
  ctx.stroke();
  ctx.restore();
}

function drawObsLaptop(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#334155";
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  strokeRoundRect(ctx, -16, -12, 32, 22, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#22d3ee";
  ctx.globalAlpha = 0.35 + Math.sin(t * 2) * 0.1;
  ctx.fillRect(-12, -8, 24, 14);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#475569";
  ctx.fillRect(-20, 10, 40, 5);
  ctx.strokeRect(-20, 10, 40, 5);
  ctx.restore();
}

function drawObsShower(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-14, -18);
  ctx.lineTo(14, -18);
  ctx.stroke();
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    const off = (t * 3 + i) % 4;
    ctx.beginPath();
    ctx.moveTo(i * 6, -14);
    ctx.lineTo(i * 6 + off, 14);
    ctx.stroke();
  }
  ctx.restore();
}

function drawObsBelt(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x + Math.sin(t) * 0.6, y);
  ctx.fillStyle = "#57534e";
  ctx.strokeStyle = "#292524";
  ctx.lineWidth = 2;
  strokeRoundRect(ctx, -18, -6, 36, 12, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#d6d3d1";
  ctx.strokeStyle = "#44403c";
  ctx.beginPath();
  ctx.rect(-5, -4, 10, 8);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#78716c";
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(16, 0);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawObsStress(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#a855f7";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  const w = Math.sin(t * 1.5) * 3;
  ctx.beginPath();
  ctx.moveTo(-14, -8 + w);
  for (let i = 0; i < 5; i++) {
    ctx.lineTo(-14 + i * 7, i % 2 === 0 ? 8 + w : -8 + w);
  }
  ctx.stroke();
  ctx.strokeStyle = "#c084fc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, 4);
  ctx.quadraticCurveTo(0, -12, 10, 4);
  ctx.stroke();
  ctx.restore();
}

function drawObsDryWind(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#a8a29e";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const yy = -10 + i * 5;
    const sh = ((t * 40 + i * 12) % 28) - 14;
    ctx.beginPath();
    ctx.moveTo(-16 + sh, yy);
    ctx.lineTo(16 + sh, yy);
    ctx.stroke();
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
    ctx.strokeStyle = "rgba(34,211,238,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, TAU);
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
    ctx.strokeStyle = "rgba(244,114,182,0.45)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, TAU);
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
  ctx.strokeStyle = "rgba(248,113,113,0.55)";
  ctx.lineWidth = 2;
  strokeRoundRect(ctx, cx - 26, cy - 22, 52, 44, 4);
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
