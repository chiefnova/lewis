import { describe, expect, it } from "vitest";
import { renderConnectRequestEmail } from "./connect-request.js";

describe("renderConnectRequestEmail", () => {
  const baseInput = {
    programSlug: "wst-057",
    programName: "WST-057",
    submittedDateMt: "May 26, 2026",
    patientName: "Sam Sample",
    patientEmail: "sam@example.com",
    patientPhone: null,
    bestTimeToContact: null,
    situation: null,
    eligibility: null,
  };

  it("subject matches § 18.4 verbatim format", () => {
    const out = renderConnectRequestEmail(baseInput);
    expect(out.subject).toBe("[Lewis] New patient inquiry for WST-057 — May 26, 2026");
  });

  it("plain-text body includes patient name + email", () => {
    const out = renderConnectRequestEmail(baseInput);
    expect(out.text).toContain("Name:  Sam Sample");
    expect(out.text).toContain("Email: sam@example.com");
    // The base case has no phone / best time / situation; those lines
    // must be absent.
    expect(out.text).not.toContain("Phone:");
    expect(out.text).not.toContain("Best time:");
    expect(out.text).not.toContain("Patient's note:");
  });

  it("HTML body links the patient email as mailto:", () => {
    const out = renderConnectRequestEmail(baseInput);
    expect(out.html).toContain('href="mailto:sam@example.com"');
  });

  it("includes phone + best time when present", () => {
    const out = renderConnectRequestEmail({
      ...baseInput,
      patientPhone: "+1 (406) 555-1212",
      bestTimeToContact: "evenings",
    });
    expect(out.text).toContain("Phone: +1 (406) 555-1212");
    expect(out.text).toContain("Best time: evenings");
    expect(out.html).toContain("+1 (406) 555-1212");
    expect(out.html).toContain("evenings");
  });

  it("renders the situation block when patient wrote one", () => {
    const out = renderConnectRequestEmail({
      ...baseInput,
      situation: "I read about WST-057 in a recent paper. My DPN diagnosis is 3 years old.",
    });
    expect(out.text).toContain("Patient's note:");
    expect(out.text).toContain("I read about WST-057");
    expect(out.html).toContain("Patient's note");
    expect(out.html).toContain("I read about WST-057");
  });

  it("omits the situation block when null (§ 18.1 optional)", () => {
    const out = renderConnectRequestEmail(baseInput);
    expect(out.text).not.toContain("Patient's note:");
    expect(out.html).not.toContain("Patient's note");
  });

  it("renders the § 17.4 failed_criterion when eligibility was failed", () => {
    const out = renderConnectRequestEmail({
      ...baseInput,
      eligibility: {
        status: "failed",
        answers: { age_18_plus: "yes", dpn_diagnosis: "no" },
        failedCriterion:
          "The program requires a confirmed diabetic peripheral neuropathy diagnosis from a treating physician.",
      },
    });
    expect(out.text).toContain("Status:");
    expect(out.text).toContain("May not be a fit");
    expect(out.text).toContain("confirmed diabetic peripheral neuropathy diagnosis");
    expect(out.html).toContain("May not be a fit");
    expect(out.html).toContain("confirmed diabetic peripheral neuropathy diagnosis");
  });

  it("renders the passed-eligibility outcome (no failed_criterion clause)", () => {
    const out = renderConnectRequestEmail({
      ...baseInput,
      eligibility: {
        status: "passed",
        answers: { age_18_plus: "yes", dpn_diagnosis: "yes" },
        failedCriterion: null,
      },
    });
    expect(out.text).toContain("Status:");
    expect(out.text).toContain("May be a fit");
    expect(out.text).not.toContain("May not be a fit");
    expect(out.html).toContain("May be a fit");
  });

  it("escapes HTML in user-supplied strings (defense against injection)", () => {
    const out = renderConnectRequestEmail({
      ...baseInput,
      patientName: '<script>alert("xss")</script>',
      situation: "<img src=x onerror=alert(1)>",
    });
    expect(out.html).not.toContain("<script>");
    expect(out.html).not.toContain("<img src=x");
    expect(out.html).toContain("&lt;script&gt;");
    expect(out.html).toContain("&lt;img src=x");
  });

  it("does not embed unsubscribe / marketing-style footer (this is transactional)", () => {
    const out = renderConnectRequestEmail(baseInput);
    expect(out.text).not.toContain("unsubscribe");
    expect(out.html).not.toContain("unsubscribe");
  });
});
