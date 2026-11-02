/**
 * Kolam lattice: the dot grid and looping strokes of South Indian threshold drawings, used once,
 * behind the homepage hero. Purely decorative.
 */
export function KolamPattern({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden focusable="false">
      <defs>
        <pattern id="kolam" width="56" height="56" patternUnits="userSpaceOnUse">
          <g fill="currentColor" opacity="0.55">
            <circle cx="14" cy="14" r="1.6" />
            <circle cx="42" cy="14" r="1.6" />
            <circle cx="14" cy="42" r="1.6" />
            <circle cx="42" cy="42" r="1.6" />
            <circle cx="28" cy="28" r="1.6" />
          </g>
          <g fill="none" stroke="currentColor" strokeWidth="1" opacity="0.35" strokeLinecap="round">
            <path d="M28 6 C38 6 50 18 50 28 C50 38 38 50 28 50 C18 50 6 38 6 28 C6 18 18 6 28 6 Z" />
            <path d="M14 28 C14 20 20 14 28 14 M42 28 C42 36 36 42 28 42" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#kolam)" />
    </svg>
  );
}
