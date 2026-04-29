import { describe, expect, it } from "vitest";

import { sanitizeAccessLogMessage } from "./access-log-message.js";

describe("sanitizeAccessLogMessage", () => {
  it("strips query strings from access logs", () => {
    expect(
      sanitizeAccessLogMessage("<-- GET /v1/public/search?q=jane@example.com&condition=neuropathy"),
    ).toBe("<-- GET /v1/public/search");
    expect(sanitizeAccessLogMessage("--> GET /v1/public/search?q=1970-01-01 200 12ms")).toBe(
      "--> GET /v1/public/search 200 12ms",
    );
  });

  it("still redacts PHI-looking values outside URLs", () => {
    expect(sanitizeAccessLogMessage("request failed for jane@example.com")).toBe(
      "request failed for [REDACTED_EMAIL]",
    );
  });
});
