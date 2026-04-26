import { FormattedMessage } from "react-intl";
import { MontanaIcon } from "./icons";

export function AnnouncementStrip() {
  return (
    <div style={{ background: "var(--paper-deep)", borderBottom: "1px solid rgba(40,30,20,0.04)" }}>
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 24px",
          height: 50,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ color: "var(--ink)", display: "flex", alignItems: "center" }}>
          <MontanaIcon size={20} />
        </div>
        <div style={{ flex: 1, textAlign: "center", fontSize: 13.5, color: "var(--ink)" }}>
          <FormattedMessage
            id="directory.announcement"
            defaultMessage="Corridor is just getting started. New programs and ETCs are added as Montana licenses them."
          />
        </div>
        <button
          type="button"
          disabled
          aria-describedby="announcement-cta-pending"
          className="pill pill-outline pill-sm"
          style={{
            borderColor: "rgba(27,24,20,0.35)",
            opacity: 0.55,
            cursor: "not-allowed",
          }}
        >
          <FormattedMessage id="directory.announcement.cta" defaultMessage="Get notified" />
        </button>
        <span id="announcement-cta-pending" className="visually-hidden">
          Email signup endpoint is not yet wired
        </span>
      </div>
    </div>
  );
}
