// Inline SVG "still-life" product placeholders — restrained, single object, soft shadow.
// All on transparent backgrounds; parent provides the cream surface.
// Ported AS IS from the design handoff. SVG ids are document-scoped, so each
// rendered instance gets a unique id namespace via React.useId() — when the
// homepage renders multiple SVGs side by side the gradients and blur filter
// resolve to the right element instead of falling back to the first match.

import { useId } from "react";

interface BaseProps {
  size?: number;
}

interface ColoredProps extends BaseProps {
  color?: string;
}

interface RotateProps extends BaseProps {
  rotate?: number;
}

interface MiniPillProps extends BaseProps {
  kind?: "rose" | "sage" | "amber" | "cream";
}

interface MiniCapsuleProps extends BaseProps {
  rot?: number;
}

interface ShadowEllipseProps {
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  blurId: string;
}

function ShadowEllipse({ cx = 100, cy = 175, rx = 55, ry = 8, blurId }: ShadowEllipseProps) {
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill="rgba(40,30,20,0.18)"
      filter={`url(#${blurId})`}
    />
  );
}

function Defs({
  ids,
}: {
  ids: { blur: string; tubeBody: string; vialBody: string; capsuleA: string; capsuleB: string };
}) {
  return (
    <defs>
      <filter id={ids.blur} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <linearGradient id={ids.tubeBody} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#FAFAF6" />
        <stop offset="0.5" stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#E8E2D2" />
      </linearGradient>
      <linearGradient id={ids.vialBody} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="rgba(255,255,255,0.6)" />
        <stop offset="0.5" stopColor="rgba(255,255,255,0.95)" />
        <stop offset="1" stopColor="rgba(220,210,190,0.7)" />
      </linearGradient>
      <linearGradient id={ids.capsuleA} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#E8B58A" />
        <stop offset="1" stopColor="#C8956A" />
      </linearGradient>
      <linearGradient id={ids.capsuleB} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F5E8D8" />
        <stop offset="1" stopColor="#D9CAB0" />
      </linearGradient>
    </defs>
  );
}

function useSvgIds() {
  const id = useId();
  return {
    blur: `${id}-blur`,
    tubeBody: `${id}-tubeBody`,
    vialBody: `${id}-vialBody`,
    capsuleA: `${id}-capsuleA`,
    capsuleB: `${id}-capsuleB`,
  };
}

// Topical tube — for WST-057
export function TopicalTube({ size = 320 }: BaseProps) {
  const ids = useSvgIds();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <Defs ids={ids} />
      <ShadowEllipse cx={108} cy={172} rx={52} ry={6} blurId={ids.blur} />
      <rect x="68" y="38" width="64" height="124" rx="10" fill={`url(#${ids.tubeBody})`} />
      <rect x="74" y="44" width="6" height="110" rx="3" fill="rgba(255,255,255,0.7)" />
      <rect x="78" y="22" width="44" height="22" rx="3" fill="#2A2622" />
      <rect x="80" y="24" width="2" height="18" fill="rgba(255,255,255,0.15)" />
      <rect x="68" y="158" width="64" height="6" fill="#D8D0BE" />
      <rect x="68" y="164" width="64" height="2" fill="#A89E84" />
    </svg>
  );
}

export function Vial({ size = 320 }: BaseProps) {
  const ids = useSvgIds();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <Defs ids={ids} />
      <ShadowEllipse cx={102} cy={170} rx={42} ry={6} blurId={ids.blur} />
      <rect
        x="72"
        y="58"
        width="56"
        height="100"
        rx="6"
        fill={`url(#${ids.vialBody})`}
        stroke="rgba(40,30,20,0.06)"
      />
      <rect x="74" y="98" width="52" height="58" rx="2" fill="rgba(220,210,180,0.45)" />
      <rect x="78" y="64" width="4" height="86" fill="rgba(255,255,255,0.7)" />
      <rect x="84" y="48" width="32" height="14" fill="rgba(255,255,255,0.85)" />
      <rect x="80" y="38" width="40" height="14" rx="2" fill="#C8B8A0" />
      <rect x="86" y="32" width="28" height="8" rx="2" fill="#7A2E2E" />
    </svg>
  );
}

export function Capsule({ size = 320, rotate = -28 }: RotateProps) {
  const ids = useSvgIds();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <Defs ids={ids} />
      <ShadowEllipse cx={102} cy={140} rx={56} ry={5} blurId={ids.blur} />
      <g transform={`rotate(${rotate} 100 100)`}>
        <rect x="40" y="86" width="120" height="32" rx="16" fill={`url(#${ids.capsuleB})`} />
        <rect x="40" y="86" width="60" height="32" rx="16" fill={`url(#${ids.capsuleA})`} />
        <rect x="46" y="92" width="40" height="4" rx="2" fill="rgba(255,255,255,0.4)" />
        <rect x="106" y="92" width="40" height="4" rx="2" fill="rgba(255,255,255,0.55)" />
      </g>
    </svg>
  );
}

export function Tablet({ size = 320, color = "#D9B8A0" }: ColoredProps) {
  const ids = useSvgIds();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <Defs ids={ids} />
      <ShadowEllipse cx={102} cy={120} rx={48} ry={5} blurId={ids.blur} />
      <g transform="rotate(-18 100 100)">
        <ellipse cx="100" cy="100" rx="56" ry="20" fill={color} />
        <ellipse cx="100" cy="94" rx="46" ry="6" fill="rgba(255,255,255,0.35)" />
      </g>
    </svg>
  );
}

export function RoundTablet({ size = 320, color = "#E89B6E" }: ColoredProps) {
  const ids = useSvgIds();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <Defs ids={ids} />
      <ShadowEllipse cx={102} cy={130} rx={32} ry={4} blurId={ids.blur} />
      <ellipse cx="100" cy="105" rx="28" ry="10" fill="rgba(40,30,20,0.10)" />
      <circle cx="100" cy="100" r="28" fill={color} />
      <ellipse cx="92" cy="92" rx="14" ry="5" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}

export function Pen({ size = 320 }: BaseProps) {
  const ids = useSvgIds();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <Defs ids={ids} />
      <ShadowEllipse cx={100} cy={138} rx={70} ry={5} blurId={ids.blur} />
      <g transform="rotate(-12 100 100)">
        <rect x="30" y="92" width="138" height="20" rx="10" fill="#E8E2D2" />
        <rect x="30" y="92" width="32" height="20" rx="10" fill="#C8C0AC" />
        <rect x="160" y="96" width="14" height="12" rx="6" fill="#2E5A3D" />
        <rect x="34" y="96" width="3" height="12" rx="1.5" fill="#9A9078" />
        <rect x="40" y="96" width="3" height="12" rx="1.5" fill="#9A9078" />
      </g>
    </svg>
  );
}

export function IVBag({ size = 320 }: BaseProps) {
  const ids = useSvgIds();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <Defs ids={ids} />
      <ShadowEllipse cx={100} cy={170} rx={48} ry={5} blurId={ids.blur} />
      <path
        d="M70 40 Q70 36 74 36 L126 36 Q130 36 130 40 L132 152 Q132 158 126 158 L74 158 Q68 158 68 152 Z"
        fill="rgba(255,255,255,0.85)"
        stroke="rgba(40,30,20,0.08)"
      />
      <path
        d="M70 90 L130 90 L131 152 Q131 156 126 156 L74 156 Q69 156 69 152 Z"
        fill="rgba(220,210,180,0.4)"
      />
      <rect x="92" y="28" width="16" height="10" rx="2" fill="#C8B8A0" />
      <rect x="98" y="158" width="4" height="14" fill="#9A9078" />
    </svg>
  );
}

export function MiniPill({ kind = "rose", size = 56 }: MiniPillProps) {
  const id = useId();
  const blurId = `${id}-mblur`;
  const colors: Record<NonNullable<MiniPillProps["kind"]>, string> = {
    rose: "#D9A4A4",
    sage: "#A4B8A8",
    amber: "#C8956A",
    cream: "#E8DCC0",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <defs>
        <filter id={blurId}>
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      <ellipse
        cx="30"
        cy="42"
        rx="14"
        ry="3"
        fill="rgba(40,30,20,0.18)"
        filter={`url(#${blurId})`}
      />
      <ellipse cx="30" cy="30" rx="16" ry="9" fill={colors[kind]} />
      <ellipse cx="26" cy="26" rx="6" ry="2" fill="rgba(255,255,255,0.45)" />
    </svg>
  );
}

export function MiniCapsule({ size = 56, rot = 30 }: MiniCapsuleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <ellipse cx="30" cy="42" rx="14" ry="3" fill="rgba(40,30,20,0.18)" />
      <g transform={`rotate(${rot} 30 30)`}>
        <rect x="10" y="24" width="40" height="12" rx="6" fill="#E8DCC0" />
        <rect x="10" y="24" width="20" height="12" rx="6" fill="#7A6B52" />
      </g>
    </svg>
  );
}
