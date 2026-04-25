import React from "react";
import { createRoot } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import messages from "./messages/en.json";
import { PatientHome } from "./portal/PatientHome";
import { PublicHome } from "./portal/PublicHome";
import "./styles.css";

const router = createBrowserRouter([
  { path: "/", element: <PublicHome /> },
  { path: "/me/*", element: <PatientHome /> },
]);

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <IntlProvider locale="en" messages={messages}>
      <RouterProvider router={router} />
    </IntlProvider>
  </React.StrictMode>,
);
