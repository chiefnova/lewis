import { FormattedMessage } from "react-intl";

import montanaFlag from "../assets/montana-flag.svg";
import { EmailSignupForm } from "./EmailSignupForm";

/**
 * Slice 4 § 11.2 — revised AnnouncementStrip copy + wired EmailSignupForm.
 * Replaces the slice-3 disabled-button stub. Renders only on the homepage
 * (gated in DirectoryLayout via `location.pathname === "/"`).
 */
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
          {/* Message hides on mobile (≤768px) so the flag + form stay on one
              compact row; full copy shows on desktop. */}
          <span className="announce-strip__text">
            <FormattedMessage
              id="directory.announcement"
              defaultMessage="Lewis is just getting started. WST-057 is live; new Montana programs are added as ETCs onboard."
            />
          </span>
          <EmailSignupForm source="announcement_strip" variant="announcement" />
        </div>
      </div>
    </div>
  );
}
