"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Bebas_Neue } from "next/font/google";
import { THEME } from "./theme";

const ORANGE = THEME.orange;
const CREAM = THEME.cream;
const BG = THEME.bg;

const font = Bebas_Neue({ subsets: ["latin"], weight: "400" });

const TEXT = "MORA MORA";

// Géométrie du A (em)
const STROKE = 0.115; // épaisseur d'une jambe
const CAP_H = 0.7; // hauteur des capitales
const GROUND = 0.8; // ligne de base des lettres (à ajuster si décalage vertical)
const F0 = 0.17; // demi-écart des pieds quand c'est un vrai A
const BAR_AT = 0.66; // position de la barre le long de la jambe (0 = sommet, 1 = pied)
const LEG = Math.hypot(CAP_H, F0); // longueur totale d'une jambe
const L1 = LEG * 0.55; // cuisse
const L2 = LEG * 0.45; // tibia

// Animation
const S0 = 1.5; // zoom de départ de tout le logo (1 = taille finale)
const PREP_MS = 450; // flexion initiale : le A s'abaisse et écarte les jambes
const STEP_MS = 450; // durée d'un pas
const SETTLE_MS = 550; // le A se redresse à la fin
const LIFT = 0.16; // hauteur de levée du pied
const H0 = 0.6; // hauteur du bassin pendant la marche (jambes fléchies)
const BOB = 0.035; // oscillation verticale du bassin
const HOLD_MS = 600;
const CORNER_MS = 1200;
const CORNER_SCALE = 0.3;
const CORNER_PAD = "1.5rem";

// Largeur de chaque emplacement de lettre (em)
const SLOT_W: Record<string, number> = {
  M: 0.58,
  O: 0.43,
  R: 0.43,
  A: 0.44,
  " ": 0.22,
};

const widths = TEXT.split("").map((c) => SLOT_W[c]);
const offsets = widths.map((_, i) =>
  widths.slice(0, i).reduce((a, b) => a + b, 0)
);
const centers = widths.map((w, i) => offsets[i] + w / 2);
const TOTAL = widths.reduce((a, b) => a + b, 0);
const LAST = TEXT.length - 1;

const N = LAST; // nombre de pas
const STRIDE = (centers[LAST] - centers[0]) / N;
const HALF = STRIDE / 2;
const WALK_MS = PREP_MS + N * STEP_MS;
const TOTAL_MS = WALK_MS + SETTLE_MS;

const ORDER = [
  "orange",
  "line",
  "bar",
  "shrink",
  "split",
  "travel",
  "done",
  "corner",
] as const;
type Phase = (typeof ORDER)[number];

type Pt = { x: number; y: number };
// g = zoom global, (hx, hy) = sommet du A (bassin), feet = pieds
type Pose = { hx: number; hy: number; g: number; feet: [Pt, Pt] };

const smooth = (u: number) => u * u * (3 - 2 * u);
const ease = (u: number) =>
  u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
const clamp01 = (u: number) => Math.min(1, Math.max(0, u));

function stand(hx: number, g: number, a: number, H: number): Pose {
  return {
    hx,
    hy: GROUND - H,
    g,
    feet: [
      { x: hx + a, y: GROUND },
      { x: hx - a, y: GROUND },
    ],
  };
}

function poseAt(t: number): Pose {
  // 1) flexion : les jambes s'écartent et le bassin descend
  if (t < PREP_MS) {
    const e = smooth(t / PREP_MS);
    return stand(centers[0], S0, F0 + (HALF - F0) * e, CAP_H + (H0 - CAP_H) * e);
  }
  // 2) la marche : un pied planté, l'autre se lève, passe devant et se repose
  const w = t - PREP_MS;
  if (w < N * STEP_MS) {
    const g = S0 + (1 - S0) * ease(clamp01(w / (N * STEP_MS)));
    const k = Math.floor(w / STEP_MS);
    const u = (w - k * STEP_MS) / STEP_MS;
    const hx = centers[0] + (k + 0.5 * u + 0.5 * smooth(u)) * STRIDE;
    const xs = centers[0] + k * STRIDE + HALF; // pied d'appui, immobile
    const xw = xs - STRIDE + 2 * STRIDE * smooth(u); // pied qui avance
    const H = H0 + BOB * Math.sin(Math.PI * u); // le bassin monte quand le pied passe
    return {
      hx,
      hy: GROUND - H,
      g,
      feet: [
        { x: xs, y: GROUND },
        { x: xw, y: GROUND - LIFT * Math.sin(Math.PI * u) },
      ],
    };
  }
  // 3) le A se redresse : les jambes se tendent et se rejoignent
  const r = smooth(clamp01((w - N * STEP_MS) / SETTLE_MS));
  return stand(centers[LAST], 1, HALF + (F0 - HALF) * r, H0 + (CAP_H - H0) * r);
}

// Cinématique inverse à deux segments : le genou se plie vers l'avant (+x)
function knee(hip: Pt, foot: Pt): Pt {
  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(L1 - L2) + 1e-3), L1 + L2 - 1e-4);
  const cosA = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
  const a = Math.acos(Math.min(1, Math.max(-1, cosA)));
  const b = Math.atan2(dy, dx);
  return { x: hip.x + L1 * Math.cos(b - a), y: hip.y + L1 * Math.sin(b - a) };
}

// Point situé à "dist" le long de la jambe (cuisse puis tibia)
function along(hip: Pt, k: Pt, foot: Pt, dist: number): Pt {
  if (dist <= L1) {
    const t = dist / L1;
    return { x: hip.x + (k.x - hip.x) * t, y: hip.y + (k.y - hip.y) * t };
  }
  const t = Math.min(1, (dist - L1) / L2);
  return { x: k.x + (foot.x - k.x) * t, y: k.y + (foot.y - k.y) * t };
}

// Segment d'épaisseur w entre deux points
function seg(p: Pt, q: Pt, w: number): CSSProperties {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  return {
    position: "absolute",
    left: `${p.x}em`,
    top: `${p.y}em`,
    width: `${w}em`,
    marginLeft: `${-w / 2}em`,
    height: `${Math.hypot(dx, dy)}em`,
    background: ORANGE,
    transformOrigin: "50% 0",
    transform: `rotate(${(-Math.atan2(dx, dy) * 180) / Math.PI}deg)`,
  };
}

function joint(p: Pt, w: number): CSSProperties {
  return {
    position: "absolute",
    left: `${p.x - w / 2}em`,
    top: `${p.y - w / 2}em`,
    width: `${w}em`,
    height: `${w}em`,
    borderRadius: "50%",
    background: ORANGE,
  };
}

const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";
const LEG_TRANSITION = [
  `left 0.9s ${EASE}`,
  `top 0.8s ${EASE}`,
  `height 0.8s ${EASE}`,
  `transform 0.6s ${EASE}`,
].join(", ");

// Jambe droite utilisée pendant l'intro (trait -> A), avant la marche
function introLeg(apex: Pt, foot: Pt, longLine: boolean): CSSProperties {
  const dx = foot.x - apex.x;
  const dy = foot.y - apex.y;
  return {
    position: "absolute",
    left: `${apex.x}em`,
    top: longLine ? "calc(0.5em - 50vh)" : `${apex.y}em`,
    width: `${STROKE}em`,
    marginLeft: `${-STROKE / 2}em`,
    height: longLine ? "100vh" : `${Math.hypot(dx, dy)}em`,
    background: ORANGE,
    transformOrigin: "50% 0",
    transform: `rotate(${(-Math.atan2(dx, dy) * 180) / Math.PI}deg)`,
    transition: LEG_TRANSITION,
  };
}

export default function MoraIntro({ onCorner }: { onCorner?: () => void }) {
  const [phase, setPhase] = useState<Phase>("orange");
  const [pose, setPose] = useState<Pose>(() => stand(centers[0], S0, F0, CAP_H));

  const reached = (p: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(p);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let raf = 0;
    const at = (ms: number, fn: () => void) =>
      timers.push(setTimeout(fn, ms));

    const startTravel = () => {
      setPhase("travel");
      const t0 = performance.now();
      const loop = (now: number) => {
        const t = Math.max(0, now - t0);
        setPose(poseAt(Math.min(t, TOTAL_MS)));
        if (t < TOTAL_MS) raf = requestAnimationFrame(loop);
        else {
          setPhase("done"); // le vrai "A" remplace le A dessiné
          at(HOLD_MS, () => {
            setPhase("corner"); // le logo rejoint le coin
            onCorner?.(); // la page se révèle
          });
        }
      };
      raf = requestAnimationFrame(loop);
    };

    at(500, () => setPhase("line")); // l'écran se ferme vers le centre
    at(1500, () => setPhase("bar")); // le trait devient un élément mobile
    at(1650, () => setPhase("shrink")); // le trait se raccourcit
    at(2450, () => setPhase("split")); // il se divise : le A sort au centre
    at(3300, startTravel); // le A marche, les lettres apparaissent

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
  }, []);

  const animating = reached("travel");
  const longLine = !reached("shrink");

  // Pose affichée : avant la marche, le A est immobile au centre de l'écran
  const half = reached("split") ? F0 : 0;
  const cur: Pose = animating
    ? pose
    : stand(centers[0], S0, half, CAP_H);

  const apex: Pt = { x: cur.hx, y: cur.hy };
  const [fa, fb] = cur.feet;
  const ka = knee(apex, fa);
  const kb = knee(apex, fb);

  // Barre du A : relie les deux jambes (elle suit les flexions)
  let p1 = along(apex, ka, fa, BAR_AT * LEG);
  let p2 = along(apex, kb, fb, BAR_AT * LEG);
  if (p1.x > p2.x) [p1, p2] = [p2, p1];
  const barLen = Math.hypot(p2.x - p1.x, p2.y - p1.y) + STROKE * 0.6;
  const barAng = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
  const barH = STROKE * 0.75;

  const overlayW = STROKE * S0;
  const overlayLine = `inset(0 calc(50% - ${overlayW / 2}em) 0 calc(50% - ${
    overlayW / 2
  }em))`;

  // Caméra : zoom global + centrage progressif sur "MORA MORA"
  const progress = animating
    ? clamp01((pose.hx - centers[0]) / (centers[LAST] - centers[0]))
    : 0;
  const camX = centers[0] + (TOTAL / 2 - centers[0]) * ease(progress);
  const g = animating ? pose.g : S0;

  const corner = phase === "corner";

  return (
    <main
      className={font.className}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: phase === "corner" ? "transparent" : BG,
        transition: `background ${CORNER_MS}ms ease`,
        pointerEvents: phase === "corner" ? "none" : "auto",
        overflow: "hidden",
        fontSize: "clamp(3rem, 14vw, 11rem)",
        lineHeight: 1,
      }}
    >
      {/* Écran orange qui se referme vers le centre */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: ORANGE,
          display: reached("bar") ? "none" : "block",
          clipPath: phase === "orange" ? "inset(0 0 0 0)" : overlayLine,
          transition: "clip-path 0.95s cubic-bezier(0.76, 0, 0.24, 1)",
          zIndex: 2,
        }}
      />

      {/* Logo : zoomé et centré pendant l'animation, puis réduit vers le coin haut gauche */}
      <div
        style={{
          position: "absolute",
          left: corner ? CORNER_PAD : "50%",
          top: corner ? CORNER_PAD : "50%",
          width: `${TOTAL}em`,
          height: "1em",
          transformOrigin: "0 0",
          transform: corner
            ? `scale(${CORNER_SCALE}) translate(0em, 0%)`
            : `scale(${g}) translate(${-camX}em, -50%)`,
          transition: corner
            ? `left ${CORNER_MS}ms ${EASE}, top ${CORNER_MS}ms ${EASE}, transform ${CORNER_MS}ms ${EASE}`
            : "none",
        }}
      >
        {/* Lettres : elles apparaissent juste après le passage du A */}
        {TEXT.split("").map((c, i) => {
          if (c === " ") return null;
          const isLast = i === LAST;
          const shown = isLast
            ? reached("done")
            : animating && pose.hx > centers[i] + 0.12;
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                top: 0,
                left: `${offsets[i]}em`,
                width: `${widths[i]}em`,
                textAlign: "center",
                color: isLast && !reached("done") ? ORANGE : CREAM,
                opacity: shown ? 1 : 0,
                transform: shown ? "translateY(0)" : "translateY(0.12em)",
                transition:
                  "opacity 0.35s ease, transform 0.35s ease, color 0.9s ease",
              }}
            >
              {c}
            </span>
          );
        })}

        {/* Le A marcheur */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            visibility: reached("bar") ? "visible" : "hidden",
            opacity: reached("done") ? 0 : 1,
            transition: "opacity 0.25s ease",
            zIndex: 1,
          }}
        >
          {animating ? (
            <>
              {/* Jambe A : cuisse + tibia */}
              <div style={seg(apex, ka, STROKE)} />
              <div style={seg(ka, fa, STROKE)} />
              {/* Jambe B : cuisse + tibia */}
              <div style={seg(apex, kb, STROKE)} />
              <div style={seg(kb, fb, STROKE)} />
              {/* Articulations arrondies : bassin et genoux */}
              <div style={joint(apex, STROKE)} />
              <div style={joint(ka, STROKE)} />
              <div style={joint(kb, STROKE)} />
            </>
          ) : (
            <>
              <div style={introLeg(apex, fa, longLine)} />
              <div style={introLeg(apex, fb, longLine)} />
            </>
          )}

          {/* Barre */}
          <div
            style={{
              position: "absolute",
              left: `${(p1.x + p2.x) / 2 - barLen / 2}em`,
              top: `${(p1.y + p2.y) / 2 - barH / 2}em`,
              width: `${barLen}em`,
              height: `${barH}em`,
              background: ORANGE,
              transform: `rotate(${barAng}deg) scaleX(${
                reached("split") ? 1 : 0
              })`,
              transition: animating ? "none" : "transform 0.4s ease 0.35s",
            }}
          />
        </div>
      </div>
    </main>
  );
}