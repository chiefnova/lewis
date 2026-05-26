/**
 * Marketing-subscription confirmation email — directoryprd.md § 11.2 + § 11.9
 * "wired or removed". Slice 4 wires the path; this is the email that lands
 * in a subscriber's inbox after they submit any of the three signup forms
 * (announcement strip, homepage beginning, /browse bottom).
 *
 * Voice: plain, calm, peer-level. No marketing tropes, no emoji, no
 * exclamation points, no urgency framing. Counsel reviews the rendered
 * output via the PR diff.
 *
 * The HTML is fully inlined (no external CSS, no external assets) so it
 * renders consistently across Gmail, Apple Mail, Outlook, etc. without a
 * build-time email-CSS-inliner step.
 */

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export type MarketingConfirmationInput = {
  /** Absolute URL to /marketing/confirm?token=… on the directory frontend. */
  confirmUrl: string;
  /** Absolute URL to /marketing/unsubscribe?token=… on the directory frontend. */
  unsubscribeUrl: string;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export function renderMarketingConfirmationEmail(input: MarketingConfirmationInput): RenderedEmail {
  const confirmUrl = escapeHtml(input.confirmUrl);
  const unsubscribeUrl = escapeHtml(input.unsubscribeUrl);

  const subject = "Confirm your Lewis Health updates";

  const text = [
    "You signed up for updates from Lewis Health about new experimental",
    "treatment programs and ETCs in Montana.",
    "",
    "Confirm your subscription:",
    input.confirmUrl,
    "",
    "If this wasn't you, ignore this email — your address will not be saved.",
    "",
    "To stop these emails at any time:",
    input.unsubscribeUrl,
    "",
    "Lewis Health · Independent directory",
    "Not affiliated with any sponsor or ETC.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F4EFE6;font-family:Georgia,serif;color:#1c1c1c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4EFE6;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FBF7EE;border:1px solid rgba(40,30,20,0.08);">
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <div style="font-family:Georgia,serif;font-size:22px;letter-spacing:-0.01em;color:#1c1c1c;">
              Lewis<span style="color:#7a6a4f;font-style:italic;"> health</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 0 32px;">
            <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;line-height:1.3;margin:16px 0 0 0;color:#1c1c1c;">
              Confirm your subscription
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;">
            <p style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#1c1c1c;margin:0 0 16px 0;">
              You signed up for updates from Lewis Health about new experimental
              treatment programs and licensed Experimental Treatment Centers in
              Montana.
            </p>
            <p style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#1c1c1c;margin:0 0 24px 0;">
              Click the button below to confirm. If this wasn't you, ignore
              this email — your address will not be saved.
            </p>
            <p style="margin:24px 0;">
              <a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;background:#1c1c1c;color:#FBF7EE;text-decoration:none;font-family:Georgia,serif;font-size:16px;border-radius:2px;">
                Confirm subscription
              </a>
            </p>
            <p style="font-family:Georgia,serif;font-size:13px;line-height:1.5;color:#7a6a4f;margin:24px 0 0 0;">
              Or paste this link in your browser:<br />
              <a href="${confirmUrl}" style="color:#7a6a4f;word-break:break-all;">${confirmUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;border-top:1px solid rgba(40,30,20,0.08);">
            <p style="font-family:Georgia,serif;font-size:13px;line-height:1.5;color:#7a6a4f;margin:0;">
              Lewis Health · Independent directory · Not affiliated with any
              sponsor or ETC.
            </p>
            <p style="font-family:Georgia,serif;font-size:13px;line-height:1.5;color:#7a6a4f;margin:8px 0 0 0;">
              <a href="${unsubscribeUrl}" style="color:#7a6a4f;text-decoration:underline;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject, html, text };
}
