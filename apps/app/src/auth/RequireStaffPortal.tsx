import { type StaffPortal, defaultStaffPath, readStaffPortals } from "@corridor/shared";
import { UserButton, useUser } from "@clerk/clerk-react";
import React from "react";
import { Navigate } from "react-router-dom";

import { NoAssignedPortal } from "./NoAssignedPortal";

export function RequireStaffPortal({
  portal,
  children,
}: {
  portal: StaffPortal;
  children: React.ReactNode;
}) {
  const { isLoaded, user } = useUser();

  if (!isLoaded) return <div className="auth-shell">Loading session...</div>;
  if (!readStaffPortals(user?.publicMetadata).includes(portal)) {
    const targetPath = defaultStaffPath(user?.publicMetadata);
    // Guard against a misconfig where the user's default portal IS the one
    // they were just denied — Navigate to /etc would re-mount this component
    // which would re-evaluate and Navigate again.
    if (!targetPath || targetPath === `/${portal}`) {
      return <NoAssignedPortal />;
    }
    return <Navigate to={targetPath} replace />;
  }

  return (
    <>
      <div className="user-menu">
        <UserButton afterSignOutUrl="/" />
      </div>
      {children}
    </>
  );
}
