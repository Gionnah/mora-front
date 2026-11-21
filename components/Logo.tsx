export default function Logo() {
  return (
    <div
      role="img"
      aria-label="Mora Mora"
      className="inline-flex select-none items-center gap-[0.35em] font-display text-[clamp(1.15rem,2.4vw,1.7rem)] italic leading-none tracking-tight text-cream"
    >
      <span aria-hidden="true" className="font-semibold">
        mora
      </span>
      <svg
        viewBox="0 0 40 12"
        aria-hidden="true"
        className="h-auto w-[1.1em] flex-none translate-y-[0.12em] text-lime"
      >
        <path
          d="M2 7 C 8 1, 14 1, 20 6 S 32 11, 38 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      <span aria-hidden="true" className="font-semibold">
        mora
      </span>
    </div>
  );
}