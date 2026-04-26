import { FormattedMessage } from "react-intl";
import { MontanaIcon } from "./icons";

export function AnnouncementStrip() {
  return (
    <div style={{ background: "var(--paper-deep)", borderBottom: "1px solid rgba(40,30,20,0.04)" }}>
      <div className="announce-strip">
        <span className="announce-strip__flag">
          <MontanaIcon size={20} />
        </span>
        <div className="announce-strip__group">
          <span className="announce-strip__text">
            <FormattedMessage
              id="directory.announcement"
              defaultMessage="Lewis Health is just getting started. New programs and ETCs are added as Montana licenses them."
            />
          </span>
          <button
            type="button"
            disabled
            aria-describedby="announcement-cta-pending"
            className="announce-strip__cta pill pill-outline pill-sm"
          >
            <FormattedMessage id="directory.announcement.cta" defaultMessage="Get notified" />
          </button>
        </div>
        <span id="announcement-cta-pending" className="visually-hidden">
          Email signup endpoint is not yet wired
        </span>
      </div>
    </div>
  );
}
