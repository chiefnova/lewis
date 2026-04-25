import React from "react";
import { createRoot } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import { AdminPortal } from "./portals/admin/AdminPortal";
import { EtcPortal } from "./portals/etc/EtcPortal";
import { SponsorPortal } from "./portals/sponsor/SponsorPortal";
import messages from "./messages/en.json";
import "./styles.css";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/sponsor" replace /> },
  { path: "/sponsor/*", element: <SponsorPortal /> },
  { path: "/etc/*", element: <EtcPortal /> },
  { path: "/admin/*", element: <AdminPortal /> },
]);

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <IntlProvider locale="en" messages={messages}>
      <RouterProvider router={router} />
    </IntlProvider>
  </React.StrictMode>,
);
