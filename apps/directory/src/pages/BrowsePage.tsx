import { useState } from "react";
import { Link } from "react-router-dom";
import { CATALOG } from "../data/catalog";
import { useSeo, siteUrl } from "../seo/useSeo";

interface FilterOption {
  label: string;
  count: number;
  checked?: boolean;
}

function FilterGroup({ title, options }: { title: string; options: ReadonlyArray<FilterOption> }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div
        className="serif"
        style={{
          fontSize: 13,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-soft)",
          marginBottom: 14,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {options.map((o) => (
          <label
            key={o.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 14.5,
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              defaultChecked={o.checked ?? false}
              style={{ accentColor: "var(--ink)", width: 14, height: 14 }}
            />
            <span>{o.label}</span>
            <span style={{ marginLeft: "auto", color: "var(--ink-soft)", fontSize: 12.5 }}>
              {o.count}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function BrowsePage() {
  const [sort, setSort] = useState("Recently added");

  useSeo({
    title: "Browse experimental treatments — Corridor Health",
    description:
      "Browse investigational treatments available at Montana Experimental Treatment Centers. Filter by condition, ETC location, treatment form, trial phase, or manufacturer.",
    canonical: siteUrl("/browse"),
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: CATALOG.filter((p) => p.available).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: siteUrl(`/programs/${p.slug}`),
        name: p.name,
      })),
    },
  });

  return (
    <div className="fade-up" style={{ paddingTop: 24 }}>
      <div className="container" style={{ paddingTop: 56, paddingBottom: 40 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <h1
            className="serif"
            style={{
              fontSize: "clamp(2.2rem, 4.4vw, 3.6rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: 720,
            }}
          >
            Browse experimental treatments{" "}
            <span className="italic" style={{ fontWeight: 300 }}>
              available
            </span>{" "}
            in Montana.
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: "var(--ink-soft)",
              fontSize: 13.5,
            }}
          >
            <span>Showing {CATALOG.length} treatments</span>
            <span>·</span>
            <label htmlFor="sort">Sort by</label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{
                background: "rgba(27,24,20,0.05)",
                border: "1px solid rgba(27,24,20,0.1)",
                borderRadius: 9999,
                padding: "8px 14px",
                fontFamily: "var(--sans)",
                fontSize: 13,
                color: "var(--ink)",
              }}
            >
              <option>Recently added</option>
              <option>Alphabetical</option>
              <option>Number of ETCs</option>
              <option>By condition</option>
            </select>
          </div>
        </div>
      </div>
      <div
        className="container"
        style={{ paddingBottom: 100, display: "grid", gridTemplateColumns: "260px 1fr", gap: 56 }}
      >
        <aside>
          <FilterGroup
            title="By Condition"
            options={[
              { label: "Peripheral neuropathy", count: 1 },
              { label: "ALS", count: 0 },
              { label: "Rare cancers", count: 0 },
              { label: "Autoimmune", count: 0 },
            ]}
          />
          <FilterGroup
            title="By ETC Location"
            options={[
              { label: "Bozeman", count: 1 },
              { label: "Missoula", count: 0 },
              { label: "Billings", count: 0 },
            ]}
          />
          <FilterGroup
            title="By Treatment Form"
            options={[
              { label: "Topical", count: 1 },
              { label: "Oral", count: 0 },
              { label: "Injection", count: 0 },
              { label: "Infusion", count: 0 },
              { label: "Device", count: 0 },
            ]}
          />
          <FilterGroup
            title="By Trial Phase"
            options={[
              { label: "Phase 1", count: 0 },
              { label: "Phase 2", count: 1 },
              { label: "Phase 3", count: 0 },
            ]}
          />
          <FilterGroup title="By Manufacturer" options={[{ label: "WinSanTor", count: 1 }]} />
        </aside>
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {CATALOG.map((p) => {
              const cardBody = (
                <>
                  <div
                    style={{
                      background: "var(--paper-deep)",
                      borderRadius: 4,
                      height: 280,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {p.art}
                  </div>
                  <div style={{ padding: "20px 4px 0" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 6,
                      }}
                    >
                      <div className="serif" style={{ fontSize: 22, letterSpacing: "-0.01em" }}>
                        {p.name}
                      </div>
                      {p.available && (
                        <div style={{ color: "var(--accent)", fontSize: 13, fontWeight: 500 }}>
                          Available at {p.etcs} ETC
                        </div>
                      )}
                    </div>
                    <div style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 16 }}>
                      {p.indication}
                    </div>
                    {/* Visual affordance only — the entire card is the click target. */}
                    <span
                      className="pill pill-outline"
                      aria-hidden="true"
                      style={{
                        width: "100%",
                        padding: "11px 16px",
                        opacity: p.available ? 1 : 0.5,
                      }}
                    >
                      View details
                    </span>
                  </div>
                </>
              );
              return p.available ? (
                <Link
                  key={p.slug}
                  to={`/programs/${p.slug}`}
                  className="card-lift"
                  style={{ display: "block", opacity: 1 }}
                >
                  {cardBody}
                </Link>
              ) : (
                <div key={p.slug} aria-disabled="true" style={{ opacity: 0.55, cursor: "default" }}>
                  {cardBody}
                </div>
              );
            })}
          </div>
          <div
            style={{
              marginTop: 64,
              padding: "40px 48px",
              background: "var(--paper-card)",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div className="serif" style={{ fontSize: 24, marginBottom: 6 }}>
                More programs are being added.
              </div>
              <div style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>
                Get notified when new treatments and ETCs are listed.
              </div>
            </div>
            <form
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(27,24,20,0.05)",
                borderRadius: 9999,
                padding: 4,
                minWidth: 320,
                opacity: 0.55,
              }}
              aria-disabled="true"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="Email me updates"
                aria-label="Email address for program updates"
                disabled
                style={{
                  flex: 1,
                  padding: "10px 18px",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontFamily: "var(--sans)",
                  fontSize: 14,
                  color: "var(--ink)",
                  cursor: "not-allowed",
                }}
              />
              <button
                type="submit"
                disabled
                className="pill pill-primary pill-sm"
                style={{ cursor: "not-allowed" }}
              >
                Sign up
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
