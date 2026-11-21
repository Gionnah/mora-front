"use client";

import { useState } from "react";
import { Inter } from "next/font/google";
import MoraIntro from "../components/MoraIntro";
import BlocksSlider from "../components/BlocksSlider";
import { THEME, type PanelId } from "../lib/theme";

const body = Inter({ subsets: ["latin"] });

const { bg: BG, cream: CREAM, lime: LIME } = THEME;

const NAV: { label: string; id: PanelId | null }[] = [
  { label: "Accueil", id: null },
  { label: "À propos", id: "apropos" },
  { label: "Contact", id: "contact" },
  { label: "Login", id: "login" },
];

export default function Page() {
  // passe à true quand le logo part vers le coin haut gauche
  const [ready, setReady] = useState(false);
  // popup ouverte (null = accueil)
  const [panel, setPanel] = useState<PanelId | null>(null);

  return (
    <div
      className={`${body.className} mora-root`}
      style={{
        position: "relative",
        overflow: "hidden",
        background: BG,
        color: CREAM,
      }}
    >
      <style>{`
        .mora-root { height: 100vh; height: 100dvh; }
        @keyframes moraReveal {
          from { opacity: 0; transform: scale(1.04); }
          to { opacity: 1; transform: scale(1); }
        }

        /* En-tête fixe : toujours au-dessus des blocs et des popups */
        .mora-header {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 60;
          height: 6.5rem;
          padding: 0 1.5rem;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          pointer-events: none; /* seule la pastille du menu capte les clics */
        }
        /* Pastille semi-transparente : le menu reste lisible sur n'importe quel bloc */
        .mora-nav {
          display: flex;
          gap: 2rem;
          padding: 0.7rem 1.6rem;
          border-radius: 999px;
          background: rgba(18, 64, 40, 0.5);
          border: 1px solid rgba(251, 246, 230, 0.22);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 10px 30px rgba(8, 40, 24, 0.25);
        }
        .mora-link {
          position: relative;
          background: none;
          border: none;
          cursor: pointer;
          font: inherit;
          color: ${CREAM};
          font-size: 0.95rem;
          letter-spacing: 0.04em;
          padding: 0.25rem 0;
          white-space: nowrap;
        }
        .mora-link::after {
          content: "";
          position: absolute;
          left: 0; right: 0; bottom: 0;
          height: 2px;
          background: ${LIME};
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.35s ease;
        }
        .mora-link:hover::after,
        .mora-link[data-active="true"]::after { transform: scaleX(1); }
        .mora-link[data-active="true"] { color: ${LIME}; }

        /* Mobile : le menu reste visible, sur la même ligne que le logo */
        @media (max-width: 720px) {
          .mora-header { height: 4rem; padding: 0 1rem; }
          .mora-nav { gap: 0.9rem; padding: 0.5rem 1rem; }
          .mora-link { font-size: 0.82rem; letter-spacing: 0.02em; }
        }
        @media (max-width: 380px) {
          .mora-nav { gap: 0.6rem; padding: 0.45rem 0.75rem; }
          .mora-link { font-size: 0.74rem; letter-spacing: 0; }
        }
      `}</style>

      {/* Intro : le logo termine dans le coin haut gauche */}
      <MoraIntro onCorner={() => setReady(true)} />

      {/* Contenu après l'animation */}
      {ready && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            animation: "moraReveal 1.4s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          <BlocksSlider panel={panel} onClose={() => setPanel(null)} />
        </div>
      )}

      {/* Menu */}
      <header className="mora-header">
        <nav
          className="mora-nav"
          style={{
            opacity: ready ? 1 : 0,
            transform: ready ? "translateY(0)" : "translateY(-14px)",
            pointerEvents: ready ? "auto" : "none",
            transition: "opacity 0.6s ease 0.4s, transform 0.6s ease 0.4s",
          }}
        >
          {NAV.map((item) => (
            <button
              key={item.label}
              className="mora-link"
              data-active={item.id === panel}
              onClick={() => setPanel(item.id === panel ? null : item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>
    </div>
  );
}