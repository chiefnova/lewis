import { ClerkProvider, Show, SignInButton } from "@clerk/react";
import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import { RequireStaffPortal } from "./auth/RequireStaffPortal";
import { StaffHomeRedirect } from "./auth/StaffHomeRedirect";
import messages from "./messages/en.json";
import "./styles.css";

const SponsorPortal = lazy(() =>
  import("./portals/sponsor/SponsorPortal").then((m) => ({ default: m.SponsorPortal })),
);
const EtcPortal = lazy(() =>
  import("./portals/etc/EtcPortal").then((m) => ({ default: m.EtcPortal })),
);
const AdminPortal = lazy(() =>
  import("./portals/admin/AdminPortal").then((m) => ({ default: m.AdminPortal })),
);

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function RequireSignedIn({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <div className="auth-shell">
          <h1>Corridor</h1>
          <SignInButton mode="modal">
            <button type="button">Sign in</button>
          </SignInButton>
        </div>
      </Show>
    </>
  );
}

function MissingClerkConfig() {
  return (
    <div className="auth-shell">
      <h1>Corridor</h1>
      <p>Missing VITE_CLERK_PUBLISHABLE_KEY.</p>
    </div>
  );
}

function PortalLoading() {
  return <div className="auth-shell">Loading portal...</div>;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RequireSignedIn>
        <StaffHomeRedirect />
      </RequireSignedIn>
    ),
  },
  {
    path: "/sponsor/*",
    element: (
      <RequireSignedIn>
        <RequireStaffPortal portal="sponsor">
          <Suspense fallback={<PortalLoading />}>
            <SponsorPortal />
          </Suspense>
        </RequireStaffPortal>
      </RequireSignedIn>
    ),
  },
  {
    path: "/etc/*",
    element: (
      <RequireSignedIn>
        <RequireStaffPortal portal="etc">
          <Suspense fallback={<PortalLoading />}>
            <EtcPortal />
          </Suspense>
        </RequireStaffPortal>
      </RequireSignedIn>
    ),
  },
  {
    path: "/admin/*",
    element: (
      <RequireSignedIn>
        <RequireStaffPortal portal="admin">
          <Suspense fallback={<PortalLoading />}>
            <AdminPortal />
          </Suspense>
        </RequireStaffPortal>
      </RequireSignedIn>
    ),
  },
]);

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <IntlProvider locale="en" messages={messages}>
      {publishableKey ? (
        <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
          <RouterProvider router={router} />
        </ClerkProvider>
      ) : (
        <MissingClerkConfig />
      )}
    </IntlProvider>
  </React.StrictMode>,
);
