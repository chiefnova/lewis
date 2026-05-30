/**
 * Connect-request email — directoryprd.md § 18.4 "ETC handoff format".
 * Slice 5 wires the patient → ETC handoff: the API enqueues
 * connect_request_send when a connect form is submitted, the worker
 * renders this template and sends via Resend to the ETC's intake_email
 * (with medical_director_clinical_email as fallback).
 *
 * Voice: peer-level, neutral, calm. The recipient is a clinical
 * coordinator at a licensed ETC. The email exists to:
 *   1. Tell them a patient is interested in their program.
 *   2. Give them the patient's contact info + best time to reach out.
 *   3. Surface the patient's eligibility-screen answers if they
 *      completed one (so the coordinator opens the conversation with
 *      context, not a cold call).
 *   4. Surface the patient's situation paragraph if they wrote one.
 *
 * Subject line is enforced by § 18.4: `[Lewis] New patient inquiry
 * for {program} — {date}`. The date is the patient's submission date
 * in America/Denver per CLAUDE.md timezone gotcha.
 *
 * The HTML is fully inlined; no external CSS or assets. PII in this
 * email (patient name, email, phone, optional situation) is the whole
 * point — the recipient ETC is the only intended audience and is the
 * downstream HIPAA-covered entity. Counsel reviews the rendered
 * output via the PR diff.
 */

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export type ConnectRequestEmailInput = {
  /** Program slug, e.g. "wst-057". Surfaced in the body, not the subject. */
  programSlug: string;
  /** Program display name, e.g. "WST-057". Surfaced in the § 18.4 subject. */
  programName: string;
  /** Submission date in America/Denver (per § 18.4 + CLAUDE.md timezone). */
  submittedDateMt: string;
  /** Patient contact fields — all are PII. */
  patientName: string;
  patientEmail: string;
  patientPhone: string | null;
  bestTimeToContact: string | null;
  /** Optional patient-written situation paragraph. § 18.1 made this optional. */
  situation: string | null;
  /** Eligibility self-screen state, if a session was attached. */
  eligibility: {
    status: "in_progress" | "passed" | "failed";
    answers: Record<string, string>;
    failedCriterion: string | null;
  } | null;
};

export type RenderedConnectRequestEmail = {
  subject: string;
  html: string;
  text: string;
};

export function renderConnectRequestEmail(
  input: ConnectRequestEmailInput,
): RenderedConnectRequestEmail {
  // § 18.4 subject format — verbatim. Don't drift; the ETC coordinator
  // filters their inbox on the "[Lewis] New patient inquiry" prefix.
  const subject = `[Lewis] New patient inquiry for ${input.programName} — ${input.submittedDateMt}`;

  const formattedEligibility = formatEligibility(input.eligibility);

  // Plain-text fallback — what gets shown if the recipient's client
  // strips HTML (some ETC IT setups still do). Same content as HTML,
  // just whitespace-formatted.
  const textLines = [
    `New patient inquiry — ${input.programName}`,
    `Submitted ${input.submittedDateMt} via lewis.health`,
    "",
    "Patient contact:",
    `  Name:  ${input.patientName}`,
    `  Email: ${input.patientEmail}`,
  ];
  if (input.patientPhone) textLines.push(`  Phone: ${input.patientPhone}`);
  if (input.bestTimeToContact) textLines.push(`  Best time: ${input.bestTimeToContact}`);

  if (input.situation) {
    textLines.push("", "Patient's note:", `  ${input.situation.replace(/\n/g, "\n  ")}`);
  }

  if (formattedEligibility.text) {
    textLines.push("", "Eligibility self-screen:", formattedEligibility.text);
  }

  textLines.push(
    "",
    "—",
    "Lewis is the public directory for Montana's licensed Experimental",
    "Treatment Centers. We do not provide medical advice. Reply directly",
    "to the patient's email or call them at the number above.",
    "",
    "If this inquiry is unexpected (e.g. the program is no longer offered",
    "by your center), reply to support@lewis.health and we will remove it",
    "from the directory.",
  );

  const text = textLines.join("\n");

  // HTML — single-column 600px layout, system font stack, no external
  // CSS. Patterns match the marketing-confirmation template so the two
  // emails feel like they came from the same sender.
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#3a342a;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f3ee;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#fdfcf8;border:1px solid rgba(58,52,42,0.16);">
          <tr><td style="padding:36px 40px 24px 40px;">
            <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#9c9388;margin-bottom:8px;">Lewis Health · New patient inquiry</div>
            <h1 style="margin:0 0 4px 0;font-family:Georgia,'Iowan Old Style','Palatino Linotype',serif;font-size:24px;font-weight:400;letter-spacing:-0.01em;color:#3a342a;">${escapeHtml(input.programName)}</h1>
            <div style="font-size:13px;color:#7a7264;">Submitted ${escapeHtml(input.submittedDateMt)} via lewis.health</div>
          </td></tr>

          <tr><td style="padding:0 40px 8px 40px;">
            <h2 style="margin:24px 0 12px 0;font-family:Georgia,serif;font-size:15px;font-weight:600;color:#3a342a;text-transform:uppercase;letter-spacing:0.08em;">Patient contact</h2>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:15px;line-height:1.6;">
              <tr><td style="padding:2px 12px 2px 0;color:#7a7264;width:90px;">Name</td><td style="padding:2px 0;">${escapeHtml(input.patientName)}</td></tr>
              <tr><td style="padding:2px 12px 2px 0;color:#7a7264;">Email</td><td style="padding:2px 0;"><a href="mailto:${escapeHtml(input.patientEmail)}" style="color:#5a5fc6;">${escapeHtml(input.patientEmail)}</a></td></tr>
              ${input.patientPhone ? `<tr><td style="padding:2px 12px 2px 0;color:#7a7264;">Phone</td><td style="padding:2px 0;">${escapeHtml(input.patientPhone)}</td></tr>` : ""}
              ${input.bestTimeToContact ? `<tr><td style="padding:2px 12px 2px 0;color:#7a7264;">Best time</td><td style="padding:2px 0;">${escapeHtml(input.bestTimeToContact)}</td></tr>` : ""}
            </table>
          </td></tr>

          ${
            input.situation
              ? `<tr><td style="padding:0 40px 8px 40px;">
                  <h2 style="margin:24px 0 8px 0;font-family:Georgia,serif;font-size:15px;font-weight:600;color:#3a342a;text-transform:uppercase;letter-spacing:0.08em;">Patient's note</h2>
                  <div style="font-size:15px;line-height:1.6;color:#3a342a;white-space:pre-wrap;">${escapeHtml(input.situation)}</div>
                </td></tr>`
              : ""
          }

          ${
            formattedEligibility.html
              ? `<tr><td style="padding:0 40px 8px 40px;">
                  <h2 style="margin:24px 0 8px 0;font-family:Georgia,serif;font-size:15px;font-weight:600;color:#3a342a;text-transform:uppercase;letter-spacing:0.08em;">Eligibility self-screen</h2>
                  ${formattedEligibility.html}
                </td></tr>`
              : ""
          }

          <tr><td style="padding:28px 40px 36px 40px;border-top:1px solid rgba(58,52,42,0.12);margin-top:24px;">
            <p style="margin:0 0 12px 0;font-size:13px;line-height:1.55;color:#7a7264;">Lewis is the public directory for Montana's licensed Experimental Treatment Centers. We do not provide medical advice. Reply directly to the patient's email or call them at the number above.</p>
            <p style="margin:0;font-size:13px;line-height:1.55;color:#7a7264;">If this inquiry is unexpected (e.g. the program is no longer offered by your center), reply to <a href="mailto:support@lewis.health" style="color:#5a5fc6;">support@lewis.health</a> and we will remove it from the directory.</p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

type FormattedEligibility = { html: string; text: string };

function formatEligibility(el: ConnectRequestEmailInput["eligibility"]): FormattedEligibility {
  if (!el) return { html: "", text: "" };

  const statusLabel = {
    in_progress: "In progress (not completed)",
    passed: "May be a fit",
    failed: "May not be a fit",
  }[el.status];

  const reasonText = el.failedCriterion
    ? `  Reason given by self-screen: ${el.failedCriterion}`
    : "";

  const answerLines = Object.entries(el.answers).map(([q, v]) => `  ${q}: ${v}`);

  const text = [
    `  Status: ${statusLabel}`,
    ...(reasonText ? [reasonText] : []),
    ...(answerLines.length > 0 ? ["  Answers:", ...answerLines] : []),
  ].join("\n");

  const answerHtml =
    answerLines.length > 0
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;line-height:1.55;margin-top:6px;">
${Object.entries(el.answers)
  .map(
    ([q, v]) =>
      `<tr><td style="padding:2px 12px 2px 0;color:#7a7264;font-family:Menlo,monospace;font-size:12px;vertical-align:top;">${escapeHtml(q)}</td><td style="padding:2px 0;">${escapeHtml(v)}</td></tr>`,
  )
  .join("\n")}
</table>`
      : "";

  const reasonHtml = el.failedCriterion
    ? `<p style="margin:8px 0 0 0;font-size:14px;line-height:1.55;color:#3a342a;"><em>Reason given by self-screen:</em> ${escapeHtml(el.failedCriterion)}</p>`
    : "";

  const html = `<div style="font-size:14px;line-height:1.55;">
  <div style="color:#7a7264;">Status: <strong style="color:#3a342a;">${escapeHtml(statusLabel)}</strong></div>
  ${reasonHtml}
  ${answerHtml}
  <p style="margin:8px 0 0 0;font-size:12px;color:#9c9388;font-style:italic;">The self-screen is informational. Final eligibility is the ETC clinical team's call after reviewing the treating physician's recommendation and H&amp;P.</p>
</div>`;

  return { html, text };
}
