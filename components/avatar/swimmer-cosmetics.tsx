import type { FaceExtraId, HeadgearId, NeckWearId } from "@/types";

type Phase = "behind" | "front";

type Props = {
  phase: Phase;
  headgear: HeadgearId;
  faceExtra: FaceExtraId;
  neckWear: NeckWearId;
  accent: string;
  referenceLobbyStyle: boolean;
};

function ink(ref: boolean): string {
  return ref ? "rgba(230,245,255,0.75)" : "#0f172a";
}

function soft(ref: boolean): string {
  return ref ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.35)";
}

/** Слой под головой (шея). */
function NeckWearLayer(props: { id: NeckWearId; accent: string; refStyle: boolean }) {
  const { id, accent, refStyle } = props;
  const s = ink(refStyle);
  const a = refStyle ? "rgba(255,255,255,0.55)" : accent;

  switch (id) {
    case "bow_clip":
      return (
        <g aria-hidden>
          <path
            d="M 34 31 C 32 29 32 27 34 26 C 36 27 38 27 40 28 C 42 27 44 27 46 26 C 48 27 48 29 46 31 C 44 33 42 34 40 33 C 38 34 36 33 34 31 Z"
            fill={a}
            stroke={s}
            strokeWidth={1.2}
            opacity={0.95}
          />
          <line x1={40} y1={28} x2={40} y2={32} stroke={s} strokeWidth={1} />
        </g>
      );
    case "trainer_band":
      return (
        <ellipse
          cx={40}
          cy={30}
          rx={14}
          ry={3.2}
          fill="none"
          stroke={a}
          strokeWidth={2.5}
          strokeDasharray="3 2"
          opacity={0.9}
          aria-hidden
        />
      );
    case "medal_pin":
      return (
        <g aria-hidden>
          <path d="M 40 27 L 37 32 L 43 32 Z" fill={soft(refStyle)} stroke={s} strokeWidth={1} />
          <circle cx={40} cy={34} r={3.5} fill="#fbbf24" stroke={s} strokeWidth={1.1} />
          <text
            x={40}
            y={35.5}
            textAnchor="middle"
            fontSize={4}
            fill={refStyle ? "#e2e8f0" : "#0f172a"}
            fontWeight="bold"
          >
            1
          </text>
        </g>
      );
    case "mini_float":
      return (
        <g aria-hidden>
          <ellipse cx={38} cy={32} rx={5} ry={3} fill="#38bdf8" stroke={s} strokeWidth={1.1} opacity={0.85} />
          <ellipse cx={38} cy={31} rx={2} ry={1.2} fill="rgba(255,255,255,0.5)" />
        </g>
      );
    case "ruff_collar":
      return (
        <path
          d="M 26 28 Q 30 33 34 31 Q 38 35 40 33 Q 42 35 46 31 Q 50 33 54 28 L 52 30 Q 46 36 40 35 Q 34 36 28 30 Z"
          fill={refStyle ? "rgba(255,255,255,0.25)" : "rgba(148,163,184,0.35)"}
          stroke={s}
          strokeWidth={1.1}
          aria-hidden
        />
      );
    case "dorsal_spike":
      return (
        <path
          d="M 40 5 L 35 20 L 45 20 Z"
          fill={refStyle ? "rgba(255,255,255,0.4)" : accent}
          stroke={s}
          strokeWidth={1}
          opacity={0.92}
          aria-hidden
        />
      );
    case "side_jets":
      return (
        <g aria-hidden>
          <ellipse
            cx={23}
            cy={23}
            rx={3.8}
            ry={2.3}
            fill="#38bdf8"
            stroke={s}
            strokeWidth={0.85}
            opacity={0.88}
            transform="rotate(-18 23 23)"
          />
          <ellipse
            cx={57}
            cy={23}
            rx={3.8}
            ry={2.3}
            fill="#38bdf8"
            stroke={s}
            strokeWidth={0.85}
            opacity={0.88}
            transform="rotate(18 57 23)"
          />
        </g>
      );
    default:
      return null;
  }
}

/** Лицо: очки, наклейки (поверх глаз). */
function FaceExtraLayer(props: { id: FaceExtraId; refStyle: boolean }) {
  const { id, refStyle } = props;
  const s = ink(refStyle);

  switch (id) {
    case "cool_specs":
      return (
        <g aria-hidden>
          <rect x={29} y={16} width={11} height={7} rx={2} fill="rgba(15,23,42,0.55)" stroke={s} strokeWidth={1} />
          <rect x={41} y={16} width={11} height={7} rx={2} fill="rgba(15,23,42,0.55)" stroke={s} strokeWidth={1} />
          <line x1={40} y1={19} x2={40} y2={20} stroke={s} strokeWidth={1.2} />
        </g>
      );
    case "monocle":
      return (
        <g aria-hidden>
          <circle cx={49} cy={19} r={5} fill="rgba(255,255,255,0.15)" stroke={s} strokeWidth={1.4} />
          <path d="M 54 19 Q 56 17 57 14" fill="none" stroke={s} strokeWidth={0.9} />
        </g>
      );
    case "star_glasses":
      return (
        <g fill="#fde047" stroke={s} strokeWidth={0.8} aria-hidden>
          <path d="M 34 18 L 35.5 21 L 39 21 L 36.2 23 L 37.2 26.5 L 34 24.5 L 30.8 26.5 L 31.8 23 L 29 21 L 32.5 21 Z" />
          <path d="M 48 18 L 49.5 21 L 53 21 L 50.2 23 L 51.2 26.5 L 48 24.5 L 44.8 26.5 L 45.8 23 L 43 21 L 46.5 21 Z" />
        </g>
      );
    case "cheek_sparkles":
      return (
        <g fill="none" stroke="#f472b6" strokeWidth={1.2} strokeLinecap="round" aria-hidden>
          <path d="M 28 24 L 30 24 M 29 23 L 29 25" />
          <path d="M 52 24 L 54 24 M 53 23 L 53 25" />
          <path d="M 30 27 L 32 27 M 31 26 L 31 28" />
        </g>
      );
    case "sleep_bubble":
      return (
        <g opacity={0.85} aria-hidden>
          <circle cx={56} cy={10} r={4} fill="rgba(255,255,255,0.35)" stroke={s} strokeWidth={0.8} />
          <text x={56} y={11.5} textAnchor="middle" fontSize={5} fill={s} fontWeight="bold">
            z
          </text>
          <circle cx={59} cy={6} r={2.2} fill="rgba(255,255,255,0.25)" stroke={s} strokeWidth={0.6} />
        </g>
      );
    case "dots_blush":
      return (
        <g aria-hidden>
          <circle cx={31} cy={24} r={2.2} fill="#fda4af" opacity={0.62} />
          <circle cx={49} cy={24} r={2.2} fill="#fda4af" opacity={0.62} />
        </g>
      );
    case "wink_sticker":
      return (
        <path
          d="M 45 17 Q 48 19.5 51 17"
          fill="none"
          stroke={s}
          strokeWidth={1.5}
          strokeLinecap="round"
          aria-hidden
        />
      );
    default:
      return null;
  }
}

/** Головной убор (поверх лица). */
function HeadgearLayer(props: { id: HeadgearId; accent: string; refStyle: boolean }) {
  const { id, accent, refStyle } = props;
  const s = ink(refStyle);
  const gold = refStyle ? "rgba(253,224,71,0.85)" : "#eab308";

  switch (id) {
    case "halo_ring":
      return (
        <ellipse
          cx={40}
          cy={7}
          rx={15}
          ry={4}
          fill="none"
          stroke={gold}
          strokeWidth={2}
          opacity={0.95}
          aria-hidden
        />
      );
    case "bobble_antennae":
      return (
        <g aria-hidden>
          <line x1={34} y1={9} x2={31} y2={2} stroke={s} strokeWidth={1.3} strokeLinecap="round" />
          <circle cx={31} cy={1.5} r={2.8} fill="#f472b6" stroke={s} strokeWidth={0.8} />
          <line x1={46} y1={9} x2={49} y2={2} stroke={s} strokeWidth={1.3} strokeLinecap="round" />
          <circle cx={49} cy={1.5} r={2.8} fill="#60a5fa" stroke={s} strokeWidth={0.8} />
        </g>
      );
    case "tiny_crown":
      return (
        <path
          d="M 30 11 L 33 5 L 36 9 L 40 4 L 44 9 L 47 5 L 50 11 L 48 12 L 32 12 Z"
          fill={gold}
          stroke={s}
          strokeWidth={1}
          aria-hidden
        />
      );
    case "sport_visor":
      return (
        <path
          d="M 26 12 Q 40 8 54 12 L 53 15 Q 40 12 27 15 Z"
          fill={refStyle ? "rgba(255,255,255,0.35)" : accent}
          stroke={s}
          strokeWidth={1.2}
          opacity={0.92}
          aria-hidden
        />
      );
    case "striped_headband":
      return (
        <g aria-hidden>
          <rect x={26} y={8} width={28} height={5} rx={1.5} fill="#f43f5e" stroke={s} strokeWidth={1} />
          <line x1={32} y1={8} x2={32} y2={13} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
          <line x1={40} y1={8} x2={40} y2={13} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
          <line x1={48} y1={8} x2={48} y2={13} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
        </g>
      );
    case "party_cone":
      return (
        <g aria-hidden>
          <path d="M 40 3 L 33 12 L 47 12 Z" fill="#a78bfa" stroke={s} strokeWidth={1} />
          <circle cx={37} cy={9} r={0.9} fill="#fff" />
          <circle cx={40} cy={7} r={0.9} fill="#fff" />
          <circle cx={43} cy={9} r={0.9} fill="#fff" />
        </g>
      );
    case "orbit_dots":
      return (
        <g aria-hidden>
          <circle cx={28} cy={6} r={2.2} fill="#22d3ee" stroke={s} strokeWidth={0.7} />
          <circle cx={40} cy={3.5} r={2.2} fill="#f472b6" stroke={s} strokeWidth={0.7} />
          <circle cx={52} cy={6} r={2.2} fill="#fbbf24" stroke={s} strokeWidth={0.7} />
        </g>
      );
    case "foam_horns":
      return (
        <g aria-hidden>
          <path d="M 32 9 Q 28 1 30 -3 Q 33 2 34 8" fill="#fbcfe8" stroke={s} strokeWidth={1} />
          <path d="M 48 9 Q 52 1 50 -3 Q 47 2 46 8" fill="#fbcfe8" stroke={s} strokeWidth={1} />
        </g>
      );
    case "ufo_dish":
      return (
        <g aria-hidden>
          <ellipse cx={40} cy={5} rx={8} ry={2.6} fill="#94a3b8" stroke={s} strokeWidth={0.85} opacity={0.92} />
          <ellipse cx={40} cy={3.8} rx={4} ry={1.3} fill="#e2e8f0" stroke={s} strokeWidth={0.65} />
        </g>
      );
    default:
      return null;
  }
}

/** Косметика гардероба: фаза `behind` — шея; `front` — лицо и шапка. */
export function SwimmerCosmetics(props: Props) {
  const { phase, headgear, faceExtra, neckWear, accent, referenceLobbyStyle } = props;
  if (phase === "behind") {
    if (neckWear === "none") return null;
    return <NeckWearLayer id={neckWear} accent={accent} refStyle={referenceLobbyStyle} />;
  }
  const face = faceExtra !== "none" ? <FaceExtraLayer id={faceExtra} refStyle={referenceLobbyStyle} /> : null;
  const head = headgear !== "none" ? <HeadgearLayer id={headgear} accent={accent} refStyle={referenceLobbyStyle} /> : null;
  if (!face && !head) return null;
  return (
    <>
      {face}
      {head}
    </>
  );
}
