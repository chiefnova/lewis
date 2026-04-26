// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Hoisted state for the Clerk mock so each test can flip the auth state
// before rendering. The hoisting matters because vi.mock is hoisted above
// imports — referenced via getter so the closure reads the current value.
const authState = { signedIn: false };

vi.mock("@clerk/react", () => ({
  Show: ({ when, children }: { when: "signed-in" | "signed-out"; children: React.ReactNode }) => {
    const shouldRender =
      (when === "signed-in" && authState.signedIn) ||
      (when === "signed-out" && !authState.signedIn);
    return shouldRender ? <>{children}</> : null;
  },
  SignInButton: ({ children }: { children?: React.ReactNode }) => (
    <span data-testid="sign-in-button">{children}</span>
  ),
  UserButton: () => <button data-testid="user-button">User</button>,
}));

import { RequirePatientSession } from "./RequirePatientSession";

afterEach(() => {
  cleanup();
  authState.signedIn = false;
});

describe("RequirePatientSession", () => {
  it("does NOT render children when the user is signed out", () => {
    authState.signedIn = false;
    render(
      <RequirePatientSession>
        <div data-testid="phi">Patient PHI content</div>
      </RequirePatientSession>,
    );
    expect(screen.queryByTestId("phi")).toBeNull();
    // Sign-in affordance is shown instead. The fallback heading is present
    // exactly once (no leakage from a previous test).
    expect(screen.getByText("Lewis Patient")).toBeTruthy();
    expect(screen.getByTestId("sign-in-button")).toBeTruthy();
  });

  it("renders children when the user is signed in", () => {
    authState.signedIn = true;
    render(
      <RequirePatientSession>
        <div data-testid="phi">Patient PHI content</div>
      </RequirePatientSession>,
    );
    expect(screen.getByTestId("phi").textContent).toContain("Patient PHI");
    // UserButton (sign-out affordance) is rendered alongside.
    expect(screen.getByTestId("user-button")).toBeTruthy();
    // Signed-out heading must NOT leak through.
    expect(screen.queryByText("Lewis Patient")).toBeNull();
  });

  it("does NOT leak the sign-in fallback when the user is signed in", () => {
    authState.signedIn = true;
    render(
      <RequirePatientSession>
        <div>Inner</div>
      </RequirePatientSession>,
    );
    expect(screen.queryByTestId("sign-in-button")).toBeNull();
  });

  it("does NOT leak the user button when the user is signed out", () => {
    authState.signedIn = false;
    render(
      <RequirePatientSession>
        <div>Inner</div>
      </RequirePatientSession>,
    );
    expect(screen.queryByTestId("user-button")).toBeNull();
  });
});
