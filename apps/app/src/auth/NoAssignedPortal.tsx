import { UserButton } from "@clerk/clerk-react";

export function NoAssignedPortal() {
  return (
    <div className="auth-shell">
      <h1>Corridor</h1>
      <p>No Corridor portal is assigned to this account.</p>
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}
