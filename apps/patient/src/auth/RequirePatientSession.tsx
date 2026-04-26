import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import React from "react";

/**
 * Gates patient-portal routes behind a Clerk session. The patient portal
 * exposes PHI per CLAUDE.md HIPAA #3 — children must NEVER render outside
 * the <SignedIn> branch. The signed-out fallback shows a calm sign-in
 * affordance with no marketing copy or urgency tactics (patient dignity rule).
 */
export function RequirePatientSession({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>
        <div className="user-menu">
          <UserButton afterSignOutUrl="/" />
        </div>
        {children}
      </SignedIn>
      <SignedOut>
        <div className="patient-shell auth-shell">
          <h1>Corridor Patient</h1>
          <SignInButton mode="modal">
            <button type="button">Sign in</button>
          </SignInButton>
        </div>
      </SignedOut>
    </>
  );
}
