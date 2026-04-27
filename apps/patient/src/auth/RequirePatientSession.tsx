import { Show, SignInButton, UserButton } from "@clerk/react";
import { Button } from "@lewis/ui";
import React from "react";
import { FormattedMessage } from "react-intl";

/**
 * Gates patient-portal routes behind a Clerk session. The patient portal
 * exposes PHI per CLAUDE.md HIPAA #3 — children must NEVER render outside
 * the signed-in branch. The signed-out fallback shows a calm sign-in
 * affordance with no marketing copy or urgency tactics (patient dignity rule).
 */
export function RequirePatientSession({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        <div className="user-menu">
          <UserButton />
        </div>
        {children}
      </Show>
      <Show when="signed-out">
        <div className="patient-shell auth-shell">
          <h1>
            <FormattedMessage id="patient.portalTitle" defaultMessage="Lewis Patient" />
          </h1>
          <SignInButton mode="modal">
            <Button>
              <FormattedMessage id="auth.signIn" defaultMessage="Sign in" />
            </Button>
          </SignInButton>
        </div>
      </Show>
    </>
  );
}
