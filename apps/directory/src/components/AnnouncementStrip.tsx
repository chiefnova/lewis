import { FormattedMessage } from "react-intl";

import montanaFlag from "../assets/montana-flag.svg";

export function AnnouncementStrip() {
  return (
    <div style={{ background: "var(--paper-deep)", borderBottom: "1px solid rgba(40,30,20,0.04)" }}>
      <div className="announce-strip">
        {/* Flag is decorative chrome — the announcement copy already names Montana.
            alt="" + aria-hidden keeps screen readers focused on the actual message. */}
        <span className="announce-strip__flag" aria-hidden="true">
          <img
            src={montanaFlag}
            alt=""
            className="announce-strip__flag-img"
            width={48}
            height={32}
            loading="lazy"
            decoding="async"
          />
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
