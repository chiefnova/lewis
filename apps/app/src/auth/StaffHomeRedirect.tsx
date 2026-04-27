import { defaultStaffPath } from "@lewis/shared";
import { useUser } from "@clerk/react";
import { Navigate } from "react-router-dom";

import { NoAssignedPortal } from "./NoAssignedPortal";

export function StaffHomeRedirect() {
  const { isLoaded, user } = useUser();
  if (!isLoaded) return <div className="auth-shell">Loading session...</div>;
  const targetPath = defaultStaffPath(user?.publicMetadata);
  return targetPath ? <Navigate to={targetPath} replace /> : <NoAssignedPortal />;
}
