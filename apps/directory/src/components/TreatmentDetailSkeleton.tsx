// Page-shaped shimmer skeleton for /programs/:slug while the API call
// is in flight. /design-shotgun Round 5 Variant A (approved 2026-04-30).
//
// Renders the same .split-detail shell as the live page so the layout
// doesn't jump when data arrives — sticky art panel on the left,
// content + rail silhouette on the right. Each placeholder gets the
// .program-skel class which animates a 1.4s linear-gradient sweep
// (respects prefers-reduced-motion via styles.css).

export function TreatmentDetailSkeleton() {
  return (
    <article className="split-detail" aria-busy="true" aria-live="polite">
      <div className="split-detail-art" style={{ flexDirection: "column", position: "sticky" }}>
        <div className="program-skel program-skel-art" aria-hidden="true" />
      </div>

      <div className="split-detail-content-grid">
        <main aria-hidden="true">
          <div className="program-skel program-skel-back" />
          <div className="program-skel program-skel-h1" />
          <div className="program-skel program-skel-tag" />
          <div className="program-skel program-skel-line" />
          <div className="program-skel program-skel-line short" style={{ marginBottom: 36 }} />

          <div className="program-skel-section">
            <div className="program-skel program-skel-h2" />
            <div className="program-skel program-skel-line" />
            <div className="program-skel program-skel-line" />
            <div className="program-skel program-skel-line short" />
          </div>
          <div className="program-skel-section">
            <div className="program-skel program-skel-h2" />
            <div className="program-skel program-skel-line" />
            <div className="program-skel program-skel-line med" />
          </div>
          <div className="program-skel-section">
            <div className="program-skel program-skel-h2" />
            <div className="program-skel program-skel-line" />
            <div className="program-skel program-skel-line short" />
          </div>
        </main>

        <aside aria-hidden="true">
          <div className="program-skel program-skel-rail-label" />
          <div className="program-skel program-skel-rail-item" />
          <div className="program-skel program-skel-rail-item" />
          <div className="program-skel program-skel-rail-item" />
          <div className="program-skel program-skel-rail-item" />
          <div className="program-skel program-skel-rail-item" />
        </aside>
      </div>
    </article>
  );
}
