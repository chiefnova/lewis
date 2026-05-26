import { describe, expect, test } from "vitest";

import { renderMarketingConfirmationEmail } from "./marketing-confirmation.js";

describe("renderMarketingConfirmationEmail", () => {
  const sample = {
    confirmUrl: "https://lewis.health/marketing/confirm?token=abc-123",
    unsubscribeUrl: "https://lewis.health/marketing/unsubscribe?token=def-456",
  };

  test("returns subject + html + text", () => {
    const r = renderMarketingConfirmationEmail(sample);
    expect(r.subject).toBe("Confirm your Lewis Health updates");
    expect(r.html.length).toBeGreaterThan(0);
    expect(r.text.length).toBeGreaterThan(0);
  });

  test("html contains both confirm + unsubscribe links", () => {
    const r = renderMarketingConfirmationEmail(sample);
    expect(r.html).toContain(sample.confirmUrl);
    expect(r.html).toContain(sample.unsubscribeUrl);
  });

  test("text contains both URLs unescaped", () => {
    const r = renderMarketingConfirmationEmail(sample);
    expect(r.text).toContain(sample.confirmUrl);
    expect(r.text).toContain(sample.unsubscribeUrl);
  });

  test("voice — no exclamation points, no AI vocabulary in subject", () => {
    const r = renderMarketingConfirmationEmail(sample);
    expect(r.subject).not.toMatch(/!/);
    expect(r.subject.toLowerCase()).not.toMatch(/welcome|exciting|amazing/);
  });

  test("includes independence trust signal", () => {
    const r = renderMarketingConfirmationEmail(sample);
    expect(r.html).toContain("Independent directory");
    expect(r.html).toContain("Not affiliated with any");
    expect(r.text).toContain("Independent directory");
  });

  test("escapes HTML in interpolated URLs (XSS guard)", () => {
    const r = renderMarketingConfirmationEmail({
      confirmUrl: "https://lewis.health/x?<script>alert(1)</script>",
      unsubscribeUrl: "https://lewis.health/y?token=plain",
    });
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("&lt;script&gt;");
  });
});
