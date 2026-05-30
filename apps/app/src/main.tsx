import { ClerkProvider, Show, SignInButton } from "@clerk/react";
import { Button } from "@lewis/ui";
import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { FormattedMessage, IntlProvider } from "react-intl";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import { RequireStaffPortal } from "./auth/RequireStaffPortal";
import { StaffHomeRedirect } from "./auth/StaffHomeRedirect";
import messages from "./messages/en.json";
import "@lewis/ui/styles.css";
import "./styles.css";

const ManufacturerPortal = lazy(() =>
  import("./portals/manufacturer/ManufacturerPortal").then((m) => ({
    default: m.ManufacturerPortal,
  })),
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
          <h1>Lewis</h1>
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

function MissingClerkConfig() {
  return (
    <div className="auth-shell">
      <h1>Lewis</h1>
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
    path: "/manufacturer/*",
    element: (
      <RequireSignedIn>
        <RequireStaffPortal portal="manufacturer">
          <Suspense fallback={<PortalLoading />}>
            <ManufacturerPortal />
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
