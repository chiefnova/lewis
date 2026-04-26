// Inline SVG icons used across the directory chrome and pages.
// Ported AS IS from the design handoff — do not adjust paths/strokes.

interface IconProps {
  size?: number;
}

export function MontanaIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2 7 L4 6 L7 7 L10 6 L14 7 L18 6 L22 7 L22 17 L18 18 L14 17 L10 18 L7 17 L4 18 L2 17 Z" />
    </svg>
  );
}

export function Magnifier({ size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowRight({ size = 14 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowLeft({ size = 14 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PinIcon({ size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <path d="M6 1c-2 0-3.5 1.5-3.5 3.5C2.5 7 6 11 6 11s3.5-4 3.5-6.5C9.5 2.5 8 1 6 1zm0 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
    </svg>
  );
}

export function PlusIcon({ size = 12 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      stroke="currentColor"
      strokeWidth="1.4"
      fill="none"
      aria-hidden="true"
    >
      <path d="M6 1.5v9M1.5 6h9" strokeLinecap="round" />
    </svg>
  );
}
