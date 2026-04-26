// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const authState = { signedIn: false };

vi.mock("@clerk/react", () => ({
  Show: ({ when, children }: { when: "signed-in" | "signed-out"; children: React.ReactNode }) => {
    const shouldRender =
      (when === "signed-in" && authState.signedIn) ||
      (when === "signed-out" && !authState.signedIn);
    return shouldRender ? <>{children}</> : null;
  },
  SignInButton: ({ children }: { children?: React.ReactNode }) => (
    <span data-testid="sign-in-button">{children ?? <button type="button">Sign in</button>}</span>
  ),
  UserButton: () => <button type="button">User menu</button>,
}));

import { RequirePatientSession } from "./RequirePatientSession";

afterEach(() => {
  cleanup();
  authState.signedIn = false;
});

// Color-contrast and image-alt rely on canvas/image APIs jsdom doesn't
// implement; we disable them in unit tests and rely on the live a11y review
// (per the patient portal's WCAG 2.1 AA target) for color verification.
const AXE_OPTIONS: axe.RunOptions = {
  rules: {
    region: { enabled: false },
    "color-contrast": { enabled: false },
  },
};

describe("RequirePatientSession a11y", () => {
  it("signed-out fallback has no axe violations", async () => {
    authState.signedIn = false;
    const { container } = render(
      <RequirePatientSession>
        <div>Inner</div>
      </RequirePatientSession>,
    );
    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });

  it("signed-in branch has no axe violations", async () => {
    authState.signedIn = true;
    const { container } = render(
      <RequirePatientSession>
        <main aria-label="Patient home">
          <h1>Welcome</h1>
          <p>Your visit summary will appear here.</p>
        </main>
      </RequirePatientSession>,
    );
    const results = await axe.run(container, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });
});
