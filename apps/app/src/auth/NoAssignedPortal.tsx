import { UserButton } from "@clerk/react";

export function NoAssignedPortal() {
  return (
    <div className="auth-shell">
      <h1>Lewis</h1>
      <p>No Lewis portal is assigned to this account.</p>
      <UserButton />
    </div>
  );
}
