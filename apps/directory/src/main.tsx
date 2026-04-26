import React from "react";
import { createRoot } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import messages from "./messages/en.json";
import { DirectoryLayout } from "./layout/DirectoryLayout";
import { HomePage } from "./pages/HomePage";
import { BrowsePage } from "./pages/BrowsePage";
import { TreatmentDetailPage } from "./pages/TreatmentDetailPage";
import { EtcProfilePage } from "./pages/EtcProfilePage";
import { EligibilityPage } from "./pages/EligibilityPage";
import { ConnectPage } from "./pages/ConnectPage";
import {
  ConditionsIndexPage,
  CookiesPage,
  EtcDocumentPage,
  EtcsIndexPage,
  FaqPage,
  FeedbackPage,
  ForEtcsPage,
  ForSponsorsPage,
  HowItWorksPage,
  NotFoundPage,
  PrivacyPage,
  SearchPage,
  TermsPage,
} from "./pages/StaticPages";
import "@lewis/ui/styles.css";
import "./styles.css";

// The directory is intentionally anonymous-first. Clerk is *not* loaded here —
// it would cost us bundle size, run a session-check against an empty cookie
// jar, and break the "directory bundle has no PHI code paths" pen-test posture.
//
// Clerk is only imported lazily by the ConnectPage flow at the moment a user
// commits to creating an account, and by the eligibility-result CTA when it
// detects an existing .lewis.health session cookie and wants to deep-link
// the user into patient.lewis.health. Both flows go through
// packages/auth (when scaffolded) so the import boundary is auditable.

const router = createBrowserRouter([
  {
    path: "/",
    element: <DirectoryLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "browse", element: <BrowsePage /> },
      { path: "conditions", element: <ConditionsIndexPage /> },
      { path: "conditions/:slug", element: <ConditionsIndexPage /> },
      { path: "programs/:slug", element: <TreatmentDetailPage /> },
      { path: "etcs", element: <EtcsIndexPage /> },
      { path: "etcs/:slug", element: <EtcProfilePage /> },
      { path: "etcs/:slug/manual", element: <EtcDocumentPage kind="manual" /> },
      { path: "etcs/:slug/etrb-report", element: <EtcDocumentPage kind="etrb-report" /> },
      { path: "etcs/:slug/ae-summary", element: <EtcDocumentPage kind="ae-summary" /> },
      { path: "eligibility/:programSlug", element: <EligibilityPage /> },
      { path: "eligibility/:programSlug/result", element: <EligibilityPage /> },
      { path: "connect/:programSlug", element: <ConnectPage /> },
      { path: "connect/confirmed", element: <ConnectPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "how-it-works", element: <HowItWorksPage /> },
      { path: "faq", element: <FaqPage /> },
      { path: "for-etcs", element: <ForEtcsPage /> },
      { path: "for-sponsors", element: <ForSponsorsPage /> },
      { path: "feedback", element: <FeedbackPage /> },
      { path: "privacy", element: <PrivacyPage /> },
      { path: "terms", element: <TermsPage /> },
      { path: "cookies", element: <CookiesPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <IntlProvider locale="en" messages={messages}>
      <RouterProvider router={router} />
    </IntlProvider>
  </React.StrictMode>,
);
