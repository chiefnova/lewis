import { ClerkProvider } from "@clerk/react";
import React from "react";
import { createRoot } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import { RequirePatientSession } from "./auth/RequirePatientSession";
import messages from "./messages/en.json";
import { PatientHome } from "./portal/PatientHome";
import { PublicHome } from "./portal/PublicHome";
import "./styles.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function MissingClerkConfig() {
  return (
    <div className="patient-shell auth-shell">
      <h1>Lewis Patient</h1>
      <p>Missing VITE_CLERK_PUBLISHABLE_KEY.</p>
    </div>
  );
}

const router = createBrowserRouter([
  { path: "/", element: <PublicHome /> },
  {
    path: "/me/*",
    element: (
      <RequirePatientSession>
        <PatientHome />
      </RequirePatientSession>
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
