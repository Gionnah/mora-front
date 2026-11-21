import type { ReactNode } from "react";

type SidePanelProps = {
  title: string;
  eyebrow?: string;
  /** Contenu du bloc. Tant qu'il n'est pas défini, un emplacement vide est affiché. */
  children?: ReactNode;
};

export default function SidePanel({ title, eyebrow, children }: SidePanelProps) {
  return (
    <section
      aria-label={title}
      className="flex h-full min-h-0 flex-col gap-4 p-[clamp(16px,2.2vw,24px)]"
    >
      <header className="flex-none">
        {eyebrow ? (
          <p className="mb-1 text-[0.72rem] uppercase tracking-[0.12em] text-lime">{eyebrow}</p>
        ) : null}
        <h2 className="font-display text-[1.35rem] font-semibold italic tracking-tight">{title}</h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {children ?? (
          <p className="grid h-full min-h-30 place-items-center rounded-[18px] border-[1.5px] border-dashed border-cream/30 p-4 text-center text-[0.9rem] opacity-70">
            Contenu à définir
          </p>
        )}
      </div>
    </section>
  );
}
