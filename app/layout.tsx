import type { Metadata, Viewport } from "next";
import type { CSSProperties, ReactNode } from "react";
import { DM_Sans, Fraunces } from "next/font/google";
import { THEME } from "../lib/theme";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mora Mora",
  description: "Mora Mora",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME.bg,
};

// lib/theme.ts reste la seule source de vérité : on l'expose en variables CSS,
// que globals.css transforme ensuite en couleurs Tailwind (moss, cream, ink, lime, orange).
const themeVars = {
  "--bg": THEME.bg,
  "--cream": THEME.cream,
  "--orange": THEME.orange,
  "--lime": THEME.lime,
  "--ink": THEME.ink,
} as CSSProperties;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      <body style={themeVars} className="antialiased">
        {children}
      </body>
    </html>
  );
}