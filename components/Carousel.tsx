"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type CarouselProps = {
  children: ReactNode;
  /** Libellés accessibles de chaque bloc (boutons de focus + navigation du bas). */
  labels?: string[];
  /** Bloc affiché au chargement (par défaut : celui du milieu). */
  initialIndex?: number;
  /** Bloc rendu légèrement plus grand (par défaut : celui du milieu). */
  featuredIndex?: number;
};

// Variables de taille selon l'écran (largeur des blocs + espace entre eux).
const ROOT =
  "flex h-full min-h-0 flex-col " +
  "[--gap:14px] [--side-w:74vw] [--center-w:80vw] " +
  "sm:[--gap:18px] sm:[--side-w:min(56vw,480px)] sm:[--center-w:min(64vw,560px)] " +
  "lg:[--gap:24px] lg:[--side-w:min(25vw,340px)] lg:[--center-w:min(38vw,560px)]";

// Piste : défilement horizontal avec accroche ; sur bureau, les 3 blocs tiennent et on centre.
// before/after = espaceurs qui permettent de centrer le premier et le dernier bloc.
const TRACK =
  "relative flex min-h-0 flex-1 snap-x snap-mandatory items-center gap-[var(--gap)] " +
  "overflow-x-auto overflow-y-hidden overscroll-x-contain py-3 " +
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden " +
  "before:shrink-0 before:basis-[calc((100%_-_var(--side-w))_/_2_-_var(--gap))] before:content-[''] " +
  "after:shrink-0 after:basis-[calc((100%_-_var(--side-w))_/_2_-_var(--gap))] after:content-[''] " +
  "lg:snap-none lg:justify-center lg:overflow-visible lg:py-0 lg:before:hidden lg:after:hidden";

// Bloc : taille normale, un peu plus grand pour celui du milieu (data-variant="center").
// En mode carrousel (< lg), les blocs non actifs sont réduits et estompés.
const SLOT =
  "group relative w-[var(--side-w)] flex-none snap-center snap-always " +
  "h-[78%] max-h-[620px] lg:h-[76%] lg:max-h-[600px] " +
  "data-[variant=center]:h-[90%] data-[variant=center]:max-h-[700px] " +
  "lg:data-[variant=center]:max-h-[680px] data-[variant=center]:w-[var(--center-w)] " +
  "transition-[scale,opacity] duration-500 ease-out motion-reduce:transition-none " +
  "max-lg:data-[active=false]:scale-[0.94] max-lg:data-[active=false]:opacity-60";

// Carte flottante : clair au milieu, vert foncé translucide sur les côtés.
const CARD =
  "relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[28px] " +
  "shadow-[0_22px_44px_-22px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-cream/10 " +
  "animate-float motion-reduce:animate-none " +
  "group-data-[variant=side]:bg-ink/60 group-data-[variant=side]:text-cream group-data-[variant=side]:backdrop-blur-xl " +
  "group-data-[variant=center]:bg-cream group-data-[variant=center]:text-ink";

// Zone cliquable sur la partie visible d'un bloc voisin (carrousel uniquement).
const HIT =
  "absolute inset-0 z-[5] hidden cursor-pointer rounded-[28px] bg-transparent p-0 " +
  "focus-visible:outline-2 focus-visible:outline-lime " +
  "max-lg:group-data-[active=false]:block";

// Navigation du bas : mobile uniquement.
const NAV = "flex flex-none justify-center pb-[calc(14px_+_env(safe-area-inset-bottom))] pt-1.5 md:hidden";
const DOTS = "flex items-center gap-2.5 rounded-full bg-ink/55 px-3.5 py-2.5";
const DOT =
  "relative h-2 w-2 cursor-pointer rounded-full bg-cream/40 p-0 " +
  "transition-[width,background-color] duration-300 " +
  "after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] " +
  "focus-visible:outline-2 focus-visible:outline-lime " +
  "aria-selected:w-[26px] aria-selected:bg-lime";

/* ------------------------------------------------------------------ */

// Pendant une animation de défilement programmée, on ignore les événements de scroll
// pour éviter que l'indicateur actif ne clignote sur les blocs traversés.
const LOCK_MS = 650;

function scrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") return "auto";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

export default function Carousel({
  children,
  labels = [],
  initialIndex = 1,
  featuredIndex = 1,
}: CarouselProps) {
  const panels = Children.toArray(children);
  const count = panels.length;
  const startIndex = Math.min(Math.max(initialIndex, 0), Math.max(count - 1, 0));

  const trackRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeRef = useRef(startIndex);
  const lockedRef = useRef(false);
  const lockTimer = useRef<number | undefined>(undefined);
  const frame = useRef(0);
  const [active, setActive] = useState(startIndex);

  const centerOn = useCallback((index: number, behavior: ScrollBehavior) => {
    const track = trackRef.current;
    const slot = slotRefs.current[index];
    if (!track || !slot) return;
    const left = slot.offsetLeft + slot.offsetWidth / 2 - track.clientWidth / 2;
    track.scrollTo({ left, behavior });
  }, []);

  // Détermine le bloc le plus proche du centre de l'écran.
  const syncActive = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const middle = track.scrollLeft + track.clientWidth / 2;
    let best = activeRef.current;
    let bestDistance = Number.POSITIVE_INFINITY;
    slotRefs.current.forEach((slot, i) => {
      if (!slot) return;
      const distance = Math.abs(slot.offsetLeft + slot.offsetWidth / 2 - middle);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    if (best !== activeRef.current) {
      activeRef.current = best;
      setActive(best);
    }
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const next = Math.min(Math.max(index, 0), count - 1);
      activeRef.current = next;
      setActive(next);
      lockedRef.current = true;
      window.clearTimeout(lockTimer.current);
      lockTimer.current = window.setTimeout(() => {
        lockedRef.current = false;
        syncActive();
      }, LOCK_MS);
      centerOn(next, scrollBehavior());
    },
    [centerOn, count, syncActive],
  );

  const handleScroll = useCallback(() => {
    if (lockedRef.current) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(syncActive);
  }, [syncActive]);

  // Position initiale + recentrage lors d'un redimensionnement / rotation.
  useEffect(() => {
    centerOn(activeRef.current, "auto");
    const onResize = () => centerOn(activeRef.current, "auto");
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame.current);
      window.clearTimeout(lockTimer.current);
    };
  }, [centerOn]);

  // Flèches gauche / droite (uniquement quand le carrousel défile réellement).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const track = trackRef.current;
      if (!track || track.scrollWidth <= track.clientWidth + 1) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, video, [contenteditable='true']")) return;
      event.preventDefault();
      goTo(activeRef.current + (event.key === "ArrowRight" ? 1 : -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo]);

  return (
    <div className={ROOT}>
      <div ref={trackRef} className={TRACK} onScroll={handleScroll}>
        {panels.map((panel, i) => {
          const label = labels[i] ?? `Bloc ${i + 1}`;
          return (
            <div
              key={i}
              ref={(el) => {
                slotRefs.current[i] = el;
              }}
              className={SLOT}
              data-variant={i === featuredIndex ? "center" : "side"}
              data-active={i === active}
            >
              <div className={CARD} style={{ animationDelay: `${-i * 2.4}s` }}>
                {panel}
              </div>

              <button
                type="button"
                className={HIT}
                aria-label={`Afficher : ${label}`}
                onClick={() => goTo(i)}
              />
            </div>
          );
        })}
      </div>

      {/* Navigation du bas : mobile uniquement (md:hidden). */}
      <nav className={NAV} aria-label="Navigation entre les blocs">
        <div className={DOTS} role="tablist">
          {panels.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              className={DOT}
              aria-selected={i === active}
              aria-label={labels[i] ?? `Bloc ${i + 1}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}