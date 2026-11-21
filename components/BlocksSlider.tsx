"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { Bebas_Neue, Inter } from "next/font/google";
import { THEME, type PanelId } from "./theme";

const display = Bebas_Neue({ subsets: ["latin"], weight: "400" });
const body = Inter({ subsets: ["latin"] });

const { cream: CREAM, lime: LIME, ink: INK, bg: BG } = THEME;
const DURATION = 6500; // durée d'un slide (ms)
const OPEN_MS = 800; // durée du bloc -> popup
const CLOSE_MS = 750; // durée popup -> bloc
const EASE = "cubic-bezier(0.76, 0, 0.24, 1)";

// Texture granuleuse (bruit SVG)
const NOISE = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>'
)}")`;

type Box = { x: number; y: number; w: number; h: number }; // en % de l'écran

// Le slide 2 est le slide 1 retourné : l'écran reste toujours entièrement couvert
const mirrorX = (b: Box): Box => ({ ...b, x: 100 - b.x - b.w });
const rotate180 = (b: Box): Box => ({
  ...b,
  x: 100 - b.x - b.w,
  y: 100 - b.y - b.h,
});
// d = disposition ordinateur (paysage), m = disposition mobile (portrait)
const lay = (d: Box, m: Box) => ({
  d: [d, mirrorX(d)] as [Box, Box],
  m: [m, rotate180(m)] as [Box, Box],
});

type Block = {
  from: string;
  to: string;
  ink: string; // couleur du texte quand le bloc devient popup
  onInk: string; // couleur du texte sur un élément "ink" (bouton)
  radius: string;
  d: [Box, Box];
  m: [Box, Box];
  float: { dur: number; delay: number; amp: number };
};

// Ordre = ordre d'empilement (le dernier est au-dessus).
// Les index 0 (lime), 3 (teal) et 4 (orange) servent aux popups : voir PANEL_BLOCK.
const BLOCKS: Block[] = [
  {
    from: "#d2f542", to: "#a8dc2a", ink: INK, onInk: CREAM, radius: "min(6vw, 56px)",
    ...lay({ x: -4, y: 22, w: 29, h: 84 }, { x: -6, y: 14, w: 46, h: 52 }),
    float: { dur: 9, delay: 0, amp: 1.6 },
  },
  {
    from: "#7cc24a", to: "#4fa03a", ink: INK, onInk: CREAM, radius: "min(6vw, 56px)",
    ...lay({ x: 22, y: -8, w: 25, h: 50 }, { x: 36, y: -4, w: 40, h: 28 }),
    float: { dur: 11, delay: -3, amp: 1.2 },
  },
  {
    from: "#eaff5a", to: "#c3e633", ink: INK, onInk: CREAM, radius: "min(6vw, 56px)",
    ...lay({ x: 70, y: -8, w: 34, h: 52 }, { x: 66, y: -4, w: 40, h: 40 }),
    float: { dur: 10, delay: -5, amp: 1.8 },
  },
  {
    // bloc "Login" : teal
    from: "#1f8f74", to: "#146a56", ink: CREAM, onInk: "#0d4a3b", radius: "min(5vw, 44px)",
    ...lay({ x: 46, y: 28, w: 40, h: 26 }, { x: 50, y: 30, w: 54, h: 18 }),
    float: { dur: 12, delay: -2, amp: 1.4 },
  },
  {
    // bloc "Contact" : orange
    from: "#ffa04a", to: "#f06f1c", ink: "#2b1608", onInk: CREAM, radius: "min(4.5vw, 40px)",
    ...lay({ x: 66, y: 52, w: 19, h: 52 }, { x: 62, y: 50, w: 40, h: 30 }),
    float: { dur: 8, delay: -4, amp: 2 },
  },
  {
    from: "#b5ea3a", to: "#8fcf24", ink: INK, onInk: CREAM, radius: "999px",
    ...lay({ x: 20, y: 44, w: 7, h: 44 }, { x: 36, y: 34, w: 11, h: 30 }),
    float: { dur: 7, delay: -1, amp: 2.4 },
  },
  {
    from: "#55b050", to: "#348f40", ink: INK, onInk: CREAM, radius: "min(5vw, 44px)",
    ...lay({ x: 83, y: 48, w: 21, h: 58 }, { x: 68, y: 78, w: 38, h: 26 }),
    float: { dur: 13, delay: -6, amp: 1.3 },
  },
  {
    from: "#a6e04a", to: "#7ec62e", ink: INK, onInk: CREAM, radius: "min(5vw, 44px)",
    ...lay({ x: 27, y: 60, w: 40, h: 46 }, { x: -6, y: 62, w: 50, h: 30 }),
    float: { dur: 10, delay: -7, amp: 1.5 },
  },
  {
    from: "#68b948", to: "#43984a", ink: INK, onInk: CREAM, radius: "min(5vw, 44px)",
    ...lay({ x: 47, y: -8, w: 24, h: 34 }, { x: -6, y: -4, w: 40, h: 20 }),
    float: { dur: 12, delay: -8, amp: 1.4 },
  },
  {
    from: "#e2fb4d", to: "#b9e02f", ink: INK, onInk: CREAM, radius: "min(5vw, 44px)",
    ...lay({ x: 25, y: 40, w: 22, h: 24 }, { x: 30, y: 66, w: 40, h: 36 }),
    float: { dur: 9, delay: -2, amp: 1.7 },
  },
];

// Quel bloc se transforme en popup pour chaque entrée du menu
const PANEL_BLOCK: Record<PanelId, number> = {
  apropos: 0, // grand bloc lime
  contact: 4, // bloc orange
  login: 3, // bloc teal
};

const SLIDES = [
  {
    tag: "01 — Doucement",
    title: "",
    text: "Avancer à son rythme, avec soin et sans précipitation.",
    cta: "Démarrer un projet",
  },
  {
    tag: "02 — Sûrement",
    title: "",
    text: "Chaque détail compte, du premier croquis à la mise en ligne.",
    cta: "Voir nos services",
  },
];

type Rect = { x: number; y: number; w: number; h: number }; // px, relatif à la section
type Pop = { id: PanelId; phase: "start" | "open" | "closing"; from: Rect };

const MOBILE_QUERY = "(max-width: 720px)";

function useIsMobile() {
  // Le composant n'est monté que côté client (après l'intro) : pas de décalage d'hydratation
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return mobile;
}

export default function BlocksSlider({
  panel,
  onClose,
}: {
  panel: PanelId | null;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [pop, setPop] = useState<Pop | null>(null);
  const mobile = useIsMobile();

  const popRef = useRef<Pop | null>(null);
  const secRef = useRef<HTMLElement>(null);
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const paused = panel !== null || pop !== null;

  const go = useCallback((i: number) => {
    setIndex(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);

  // Lecture automatique (en pause tant qu'une popup est ouverte)
  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => go(index + 1), DURATION);
    return () => clearTimeout(id);
  }, [index, go, paused]);

  // Clavier : flèches pour les slides, Échap pour fermer la popup
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && panel) onClose();
      if (paused) return;
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, paused, panel, onClose]);

  // --- Bloc -> popup ---------------------------------------------------------
  const commit = (v: Pop | null) => {
    popRef.current = v;
    setPop(v);
  };

  const measure = (i: number): Rect | null => {
    const el = innerRefs.current[i];
    const sec = secRef.current;
    if (!el || !sec) return null;
    const r = el.getBoundingClientRect();
    const s = sec.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  };

  const startOpen = (id: PanelId) => {
    const from = measure(PANEL_BLOCK[id]);
    if (!from) return;
    clearTimeout(closeTimer.current);
    commit({ id, phase: "start", from });
    // deux frames : le style de départ doit être peint avant de lancer la transition
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const c = popRef.current;
        if (c && c.id === id && c.phase === "start") {
          commit({ ...c, phase: "open" });
        }
      })
    );
  };

  const startClose = () => {
    const c = popRef.current;
    if (!c) return;
    const from = measure(PANEL_BLOCK[c.id]) ?? c.from;
    commit({ ...c, phase: "closing", from });
    closeTimer.current = setTimeout(() => commit(null), CLOSE_MS);
  };

  useEffect(() => {
    clearTimeout(timer.current);
    const cur = popRef.current;
    if (panel) {
      if (!cur) startOpen(panel);
      else if (cur.id !== panel || cur.phase === "closing") {
        // changement de rubrique : l'ancienne popup se referme, puis la nouvelle s'ouvre
        if (cur.phase !== "closing") startClose();
        timer.current = setTimeout(() => startOpen(panel), CLOSE_MS + 50);
      }
    } else if (cur && cur.phase !== "closing") {
      startClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel]);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(closeTimer.current);
    },
    []
  );

  const popBlock = pop ? BLOCKS[PANEL_BLOCK[pop.id]] : null;
  const hiddenIdx = pop ? PANEL_BLOCK[pop.id] : -1;

  // Popup ouverte : toujours centrée dans l'espace situé SOUS le menu, sur mobile comme sur ordinateur
  const popRect: CSSProperties =
    pop && popBlock
      ? pop.phase === "open"
        ? {
            left: "calc(50% - min(46%, 280px))",
            top: "calc(50% + 1.5rem - min(50% - 4.5rem, 260px))",
            width: "min(92%, 560px)",
            height: "calc(2 * min(50% - 4.5rem, 260px))",
            borderRadius: 32,
          }
        : {
            left: pop.from.x,
            top: pop.from.y,
            width: pop.from.w,
            height: pop.from.h,
            borderRadius: popBlock.radius,
          }
      : {};

  return (
    <section
      ref={secRef}
      className={body.className}
      style={{
        position: "relative",
        height: "100%",
        overflow: "hidden",
        background: `radial-gradient(120% 120% at 20% 10%, #2a7048 0%, ${BG} 65%)`,
        color: CREAM,
      }}
    >
      <style>{`
        @keyframes blocksFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(var(--amp)); }
        }
        @keyframes blocksProgress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        .blocks-btn {
          display: inline-block;
          padding: 0.95rem 2rem;
          border-radius: 999px;
          background: ${LIME};
          color: ${INK};
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          transition: transform 0.3s ease, background 0.3s ease;
        }
        .blocks-btn:hover { transform: translateY(-3px); background: #d9ff55; }
        .blocks-arrow {
          width: 46px; height: 46px; border-radius: 50%;
          border: 1px solid rgba(251,246,230,0.5);
          background: rgba(255,255,255,0.12);
          color: ${CREAM}; font-size: 1.1rem; cursor: pointer;
          backdrop-filter: blur(6px);
          transition: background 0.3s ease, transform 0.3s ease;
        }
        .blocks-arrow:hover { background: rgba(198,242,61,0.35); transform: scale(1.08); }
        .pop-field {
          width: 100%;
          box-sizing: border-box;
          padding: 0.85rem 1rem;
          border-radius: 14px;
          border: 1.5px solid color-mix(in srgb, var(--ink) 25%, transparent);
          background: color-mix(in srgb, var(--ink) 10%, transparent);
          color: var(--ink);
          font: inherit;
          font-size: 16px; /* évite le zoom automatique sur iOS */
          outline: none;
          transition: border-color 0.25s ease, background 0.25s ease;
        }
        .pop-field::placeholder { color: color-mix(in srgb, var(--ink) 55%, transparent); }
        .pop-field:focus {
          border-color: var(--ink);
          background: color-mix(in srgb, var(--ink) 16%, transparent);
        }
        .pop-submit {
          padding: 0.95rem 2rem;
          border: none;
          border-radius: 999px;
          background: var(--ink);
          color: var(--on-ink);
          font: inherit;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.3s ease;
        }
        .pop-submit:hover { transform: translateY(-3px); }
        @media (max-width: 720px) {
          .blocks-arrow { width: 42px; height: 42px; }
          .blocks-btn { padding: 0.85rem 1.6rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .blocks-float { animation: none !important; }
        }
      `}</style>

      {/* Blocs animés : ils glissent d'une disposition à l'autre et couvrent tout l'écran */}
      <div aria-hidden style={{ position: "absolute", inset: 0 }}>
        {BLOCKS.map((b, i) => {
          const p = (mobile ? b.m : b.d)[index];
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.w}%`,
                height: `${p.h}%`,
                transition: `left 1.5s ${EASE} ${i * 60}ms, top 1.5s ${EASE} ${
                  i * 60
                }ms, width 1.5s ${EASE} ${i * 60}ms, height 1.5s ${EASE} ${
                  i * 60
                }ms`,
              }}
            >
              <div
                ref={(el) => {
                  innerRefs.current[i] = el;
                }}
                className="blocks-float"
                style={
                  {
                    position: "absolute",
                    inset: 0,
                    borderRadius: b.radius,
                    background: `linear-gradient(170deg, ${b.from}, ${b.to})`,
                    boxShadow:
                      "0 24px 50px rgba(10,50,30,0.32), inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -10px 24px rgba(0,0,0,0.1)",
                    animation: `blocksFloat ${b.float.dur}s ease-in-out ${b.float.delay}s infinite`,
                    opacity: i === hiddenIdx ? 0 : 1,
                    "--amp": `${b.float.amp}vh`,
                  } as CSSProperties
                }
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                    backgroundImage: NOISE,
                    mixBlendMode: "overlay",
                    opacity: 0.6,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Voile vert pour garder le texte lisible : à gauche sur ordinateur, en bas sur mobile */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: mobile
            ? "linear-gradient(180deg, rgba(22,70,44,0) 22%, rgba(22,70,44,0.82) 58%, rgba(22,70,44,0.94) 100%)"
            : "linear-gradient(90deg, rgba(22,70,44,0.82) 0%, rgba(22,70,44,0.42) 38%, rgba(22,70,44,0) 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Contenu des deux slides */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          height: "100%",
          maxWidth: "72rem",
          margin: "0 auto",
          padding: "0 1.5rem",
        }}
      >
        {SLIDES.map((s, i) => {
          const active = i === index && !paused;
          const rest = mobile ? "translateY(18px)" : "translateY(-42%)";
          const shown = mobile ? "translateY(0)" : "translateY(-50%)";
          return (
            <div
              key={s.tag}
              aria-hidden={!active}
              style={{
                position: "absolute",
                left: "1.5rem",
                right: "1.5rem",
                ...(mobile ? { bottom: "6.2rem" } : { top: "50%" }),
                maxWidth: "36rem",
                transform: active ? shown : rest,
                opacity: active ? 1 : 0,
                pointerEvents: active ? "auto" : "none",
                transition: `opacity 0.8s ease ${
                  active ? 500 : 0
                }ms, transform 1s cubic-bezier(0.22, 1, 0.36, 1) ${
                  active ? 500 : 0
                }ms`,
              }}
            >
              <span
                style={{
                  fontSize: mobile ? "0.78rem" : "0.85rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: LIME,
                }}
              >
                {s.tag}
              </span>
              <h2
                className={display.className}
                style={{
                  margin: "0.6rem 0 0.8rem",
                  fontWeight: 400,
                  fontSize: mobile
                    ? "clamp(3.4rem, 17vw, 5.5rem)"
                    : "clamp(4rem, 12vw, 9rem)",
                  lineHeight: 0.92,
                }}
              >
                {s.title}
              </h2>
              <p
                style={{
                  margin: mobile ? "0 0 1.3rem" : "0 0 2rem",
                  fontSize: mobile ? "1rem" : "1.1rem",
                  lineHeight: 1.6,
                  color: "rgba(251,246,230,0.92)",
                }}
              >
                {s.text}
              </p>
              <a href="#" className="blocks-btn">
                {s.cta}
              </a>
            </div>
          );
        })}
      </div>

      {/* Commandes : pastilles avec progression + flèches */}
      <div
        style={{
          position: "absolute",
          zIndex: 4,
          left: 0,
          right: 0,
          bottom: mobile ? "1.25rem" : "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "72rem",
          margin: "0 auto",
          padding: "0 1.5rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.6rem" }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => go(i)}
              style={{
                position: "relative",
                width: i === index ? 64 : 28,
                height: 6,
                borderRadius: 999,
                border: "none",
                padding: 0,
                cursor: "pointer",
                overflow: "hidden",
                background: "rgba(251,246,230,0.4)",
                transition: "width 0.5s ease",
              }}
            >
              {i === index && (
                <span
                  key={`${index}-${paused}`}
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: LIME,
                    transformOrigin: "left",
                    animation: paused
                      ? "none"
                      : `blocksProgress ${DURATION}ms linear forwards`,
                    transform: paused ? "scaleX(0)" : undefined,
                  }}
                />
              )}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.7rem" }}>
          <button
            className="blocks-arrow"
            aria-label="Précédent"
            onClick={() => go(index - 1)}
          >
            ←
          </button>
          <button
            className="blocks-arrow"
            aria-label="Suivant"
            onClick={() => go(index + 1)}
          >
            →
          </button>
        </div>
      </div>

      {/* Fond atténué derrière la popup */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 7,
          background: "rgba(14,56,36,0.55)",
          backdropFilter: "blur(5px)",
          opacity: pop?.phase === "open" ? 1 : 0,
          pointerEvents: pop?.phase === "open" ? "auto" : "none",
          transition: "opacity 0.6s ease",
        }}
      />

      {/* Popup : c'est le bloc qui s'agrandit pour devenir la fenêtre */}
      {pop && popBlock && (
        <div
          role="dialog"
          aria-modal="true"
          style={
            {
              position: "absolute",
              zIndex: 8,
              overflow: "hidden",
              background: `linear-gradient(170deg, ${popBlock.from}, ${popBlock.to})`,
              boxShadow: "0 40px 90px rgba(10,50,30,0.45)",
              color: popBlock.ink,
              "--ink": popBlock.ink,
              "--on-ink": popBlock.onInk,
              transition: `left ${OPEN_MS}ms ${EASE}, top ${OPEN_MS}ms ${EASE}, width ${OPEN_MS}ms ${EASE}, height ${OPEN_MS}ms ${EASE}, border-radius ${OPEN_MS}ms ${EASE}`,
              ...popRect,
            } as CSSProperties
          }
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: NOISE,
              mixBlendMode: "overlay",
              opacity: 0.5,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "relative",
              height: "100%",
              overflowY: "auto",
              padding: "clamp(1.25rem, 4vw, 2.5rem)",
              boxSizing: "border-box",
              opacity: pop.phase === "open" ? 1 : 0,
              transform: pop.phase === "open" ? "translateY(0)" : "translateY(14px)",
              transition:
                pop.phase === "open"
                  ? "opacity 0.5s ease 0.45s, transform 0.6s ease 0.45s"
                  : "opacity 0.2s ease",
            }}
          >
            <button
              onClick={onClose}
              aria-label="Fermer"
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 42,
                height: 42,
                borderRadius: "50%",
                border: "1.5px solid currentColor",
                background: "transparent",
                color: "inherit",
                fontSize: "1.3rem",
                cursor: "pointer",
                margin: "clamp(0.8rem, 3vw, 1.6rem)",
              }}
            >
              ×
            </button>
            <PanelContent id={pop.id} />
          </div>
        </div>
      )}
    </section>
  );
}

// --- Contenu des popups ------------------------------------------------------

function PanelContent({ id }: { id: PanelId }) {
  const [done, setDone] = useState(false);

  // Formulaires de démonstration : à relier à votre API / votre auth
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setDone(true);
  };

  const title = (t: string) => (
    <h2
      className={display.className}
      style={{
        margin: "0 0 1rem",
        fontWeight: 400,
        fontSize: "clamp(2.6rem, 8vw, 4.6rem)",
        lineHeight: 0.95,
        paddingRight: "3rem",
      }}
    >
      {t}
    </h2>
  );

  if (id === "apropos") {
    return (
      <>
        {title("À propos")}
        <p style={{ margin: "0 0 1.4rem", lineHeight: 1.7, fontSize: "1.05rem" }}>
          « Mora mora » signifie « doucement » en malgache. C&apos;est notre
          façon de travailler : prendre le temps, soigner les détails et
          avancer ensemble.
        </p>
        <div style={{ display: "grid", gap: "0.9rem" }}>
          {[
            ["01", "Prendre le temps", "Chaque projet avance à son rythme."],
            ["02", "Faire avec soin", "Des choix assumés, un résultat qui dure."],
            ["03", "Avancer ensemble", "Un dialogue simple, du croquis à la mise en ligne."],
          ].map(([n, t, d]) => (
            <div
              key={n}
              style={{
                display: "flex",
                gap: "1rem",
                alignItems: "baseline",
                borderTop: "1.5px solid color-mix(in srgb, var(--ink) 25%, transparent)",
                paddingTop: "0.9rem",
              }}
            >
              <span className={display.className} style={{ fontSize: "1.8rem" }}>
                {n}
              </span>
              <span style={{ lineHeight: 1.5 }}>
                <strong>{t}</strong>
                <br />
                {d}
              </span>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (id === "contact") {
    return (
      <>
        {title("Contact")}
        {done ? (
          <p style={{ lineHeight: 1.7, fontSize: "1.1rem" }}>
            Merci, votre message a bien été reçu. Nous revenons vers vous très
            vite.
          </p>
        ) : (
          <form onSubmit={submit} style={{ display: "grid", gap: "0.8rem" }}>
            <input className="pop-field" placeholder="Votre nom" required />
            <input
              className="pop-field"
              type="email"
              placeholder="Votre e-mail"
              required
            />
            <textarea
              className="pop-field"
              placeholder="Votre message"
              rows={4}
              required
              style={{ resize: "vertical" }}
            />
            <div>
              <button className="pop-submit" type="submit">
                Envoyer
              </button>
            </div>
          </form>
        )}
      </>
    );
  }

  return (
    <>
      {title("Login")}
      {done ? (
        <p style={{ lineHeight: 1.7, fontSize: "1.1rem" }}>
          Connexion réussie. Bienvenue !
        </p>
      ) : (
        <form onSubmit={submit} style={{ display: "grid", gap: "0.8rem" }} className="flex flex-col items-center h-full">
          <div className="w-full gap-4 h-full flex flex-col items-center justify-center pb-4 px-5">
            <input
              className="pop-field"
              type="email"
              placeholder="E-mail"
              autoComplete="email"
              required
            />
            <input
              className="pop-field"
              type="password"
              placeholder="Mot de passe"
              autoComplete="current-password"
              required
            />
            <button className="pop-submit w-full" type="submit">
              Se connecter
            </button>
          </div>
          <div>
          </div>
        </form>
      )}
    </>
  );
}