import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  children: ReactNode;
}

/**
 * Cream surface panel with a serif title — the standard treatment-detail and
 * ETC-profile section wrapper. Lives at component scope so the two pages can't
 * drift on padding, radius, or title typography.
 *
 * Title renders as h2 because each Panel is a top-level section under the
 * page H1; using h3 produced a heading-order axe violation
 * (TreatmentDetailPage.a11y.test.tsx caught it).
 */
export function Panel({ title, children }: PanelProps) {
  return (
    <div
      style={{ background: "var(--paper-card)", borderRadius: 6, padding: 32, marginBottom: 20 }}
    >
      <h2
        className="serif"
        style={{
          fontSize: 22,
          letterSpacing: "-0.01em",
          marginBottom: 16,
          fontWeight: 400,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}
