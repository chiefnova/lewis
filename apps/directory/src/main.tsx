import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import messages from "./messages/en.json";
import { DirectoryLayout } from "./layout/DirectoryLayout";
import { HomePage } from "./pages/HomePage";
import { SearchOverlayProvider } from "./search/SearchContext";
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
//
// HomePage is eager because it's the hot landing route — every cold visitor
// from a Google SERP hits it. Every other page is lazy-loaded behind
// React.Suspense so the initial JS payload stays under the 120KB
// above-the-fold budget per directoryprd.md § 28.2. Keep this list in sync
// with apps/directory/public/sitemap.xml — every indexable route here must
// also have a sitemap entry.

const BrowsePage = lazy(() =>
  import("./pages/BrowsePage").then((m) => ({ default: m.BrowsePage })),
);
const TreatmentDetailPage = lazy(() =>
  import("./pages/TreatmentDetailPage").then((m) => ({ default: m.TreatmentDetailPage })),
);
const EtcProfilePage = lazy(() =>
  import("./pages/EtcProfilePage").then((m) => ({ default: m.EtcProfilePage })),
);
const EligibilityPage = lazy(() =>
  import("./pages/EligibilityPage").then((m) => ({ default: m.EligibilityPage })),
);
const ConnectPage = lazy(() =>
  import("./pages/ConnectPage").then((m) => ({ default: m.ConnectPage })),
);
const SearchPage = lazy(() =>
  import("./pages/SearchPage").then((m) => ({ default: m.SearchPage })),
);
const ConditionDetailPage = lazy(() =>
  import("./pages/conditions/ConditionDetailPage").then((m) => ({
    default: m.ConditionDetailPage,
  })),
);
const ConditionsIndexPage = lazy(() =>
  import("./pages/conditions/ConditionsIndexPage").then((m) => ({
    default: m.ConditionsIndexPage,
  })),
);
// StaticPages bundles the remaining placeholder routes (FAQ, privacy, terms,
// etc.) into one chunk. Pull each named export through a thin
// module-default-export hop so React.lazy receives a Component shape.
const CookiesPage = lazy(() =>
  import("./pages/StaticPages").then((m) => ({ default: m.CookiesPage })),
);
const EtcDocumentPage = lazy(() =>
  import("./pages/StaticPages").then((m) => ({ default: m.EtcDocumentPage })),
);
const EtcsIndexPage = lazy(() =>
  import("./pages/EtcsIndexPage").then((m) => ({ default: m.EtcsIndexPage })),
);
const FaqPage = lazy(() => import("./pages/StaticPages").then((m) => ({ default: m.FaqPage })));
const FeedbackPage = lazy(() =>
  import("./pages/StaticPages").then((m) => ({ default: m.FeedbackPage })),
);
const ForEtcsPage = lazy(() =>
  import("./pages/StaticPages").then((m) => ({ default: m.ForEtcsPage })),
);
const ForSponsorsPage = lazy(() =>
  import("./pages/StaticPages").then((m) => ({ default: m.ForSponsorsPage })),
);
const HowItWorksPage = lazy(() =>
  import("./pages/StaticPages").then((m) => ({ default: m.HowItWorksPage })),
);
const AboutPage = lazy(() => import("./pages/StaticPages").then((m) => ({ default: m.AboutPage })));
const PlatformPage = lazy(() =>
  import("./pages/StaticPages").then((m) => ({ default: m.PlatformPage })),
);
const ForCliniciansPage = lazy(() =>
  import("./pages/StaticPages").then((m) => ({ default: m.ForCliniciansPage })),
);
const NotFoundPage = lazy(() =>
  import("./pages/StaticPages").then((m) => ({ default: m.NotFoundPage })),
);
const PrivacyPage = lazy(() =>
  import("./pages/StaticPages").then((m) => ({ default: m.PrivacyPage })),
);
const TermsPage = lazy(() => import("./pages/StaticPages").then((m) => ({ default: m.TermsPage })));
const MarketingConfirmPage = lazy(() =>
  import("./pages/MarketingConfirmPage").then((m) => ({ default: m.MarketingConfirmPage })),
);
const MarketingUnsubscribePage = lazy(() =>
  import("./pages/MarketingUnsubscribePage").then((m) => ({
    default: m.MarketingUnsubscribePage,
  })),
);

// Lazy-route wrapper — Suspense fallback intentionally minimal (a single
// shimmer line via the stylesheet). The loaded chunks are small and warm
// quickly; a heavy fallback would feel laggier than the bare gap.
function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

// Layout wrapper that hosts the search overlay context. The overlay code
// itself is lazy-loaded inside SearchOverlayProvider — the Radix Dialog
// chunk only ships when the user opens the overlay for the first time.
function DirectoryLayoutWithSearch() {
  return (
    <SearchOverlayProvider>
      <DirectoryLayout />
    </SearchOverlayProvider>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <DirectoryLayoutWithSearch />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "browse",
        element: (
          <LazyRoute>
            <BrowsePage />
          </LazyRoute>
        ),
      },
      {
        path: "conditions",
        element: (
          <LazyRoute>
            <ConditionsIndexPage />
          </LazyRoute>
        ),
      },
      {
        path: "conditions/:slug",
        element: (
          <LazyRoute>
            <ConditionDetailPage />
          </LazyRoute>
        ),
      },
      {
        path: "programs/:slug",
        element: (
          <LazyRoute>
            <TreatmentDetailPage />
          </LazyRoute>
        ),
      },
      {
        path: "etcs",
        element: (
          <LazyRoute>
            <EtcsIndexPage />
          </LazyRoute>
        ),
      },
      {
        path: "etcs/:slug",
        element: (
          <LazyRoute>
            <EtcProfilePage />
          </LazyRoute>
        ),
      },
      {
        path: "etcs/:slug/manual",
        element: (
          <LazyRoute>
            <EtcDocumentPage kind="manual" />
          </LazyRoute>
        ),
      },
      {
        path: "etcs/:slug/etrb-report",
        element: (
          <LazyRoute>
            <EtcDocumentPage kind="etrb-report" />
          </LazyRoute>
        ),
      },
      {
        path: "eligibility/:programSlug",
        element: (
          <LazyRoute>
            <EligibilityPage />
          </LazyRoute>
        ),
      },
      {
        path: "eligibility/:programSlug/result",
        element: (
          <LazyRoute>
            <EligibilityPage />
          </LazyRoute>
        ),
      },
      {
        path: "connect/:programSlug",
        element: (
          <LazyRoute>
            <ConnectPage />
          </LazyRoute>
        ),
      },
      {
        path: "connect/confirmed",
        element: (
          <LazyRoute>
            <ConnectPage />
          </LazyRoute>
        ),
      },
      {
        path: "search",
        element: (
          <LazyRoute>
            <SearchPage />
          </LazyRoute>
        ),
      },
      {
        path: "how-it-works",
        element: (
          <LazyRoute>
            <HowItWorksPage />
          </LazyRoute>
        ),
      },
      {
        path: "faq",
        element: (
          <LazyRoute>
            <FaqPage />
          </LazyRoute>
        ),
      },
      {
        path: "for-etcs",
        element: (
          <LazyRoute>
            <ForEtcsPage />
          </LazyRoute>
        ),
      },
      {
        path: "for-sponsors",
        element: (
          <LazyRoute>
            <ForSponsorsPage />
          </LazyRoute>
        ),
      },
      {
        path: "for-clinicians",
        element: (
          <LazyRoute>
            <ForCliniciansPage />
          </LazyRoute>
        ),
      },
      {
        path: "about",
        element: (
          <LazyRoute>
            <AboutPage />
          </LazyRoute>
        ),
      },
      {
        path: "platform",
        element: (
          <LazyRoute>
            <PlatformPage />
          </LazyRoute>
        ),
      },
      {
        path: "feedback",
        element: (
          <LazyRoute>
            <FeedbackPage />
          </LazyRoute>
        ),
      },
      {
        path: "privacy",
        element: (
          <LazyRoute>
            <PrivacyPage />
          </LazyRoute>
        ),
      },
      {
        path: "terms",
        element: (
          <LazyRoute>
            <TermsPage />
          </LazyRoute>
        ),
      },
      {
        path: "cookies",
        element: (
          <LazyRoute>
            <CookiesPage />
          </LazyRoute>
        ),
      },
      {
        path: "marketing/confirm",
        element: (
          <LazyRoute>
            <MarketingConfirmPage />
          </LazyRoute>
        ),
      },
      {
        path: "marketing/unsubscribe",
        element: (
          <LazyRoute>
            <MarketingUnsubscribePage />
          </LazyRoute>
        ),
      },
      {
        path: "*",
        element: (
          <LazyRoute>
            <NotFoundPage />
          </LazyRoute>
        ),
      },
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
