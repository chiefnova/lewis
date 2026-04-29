/**
 * Curated "Recent on Lewis" list shown in the empty-query state of the
 * search overlay and search results page. Per directoryprd.md § 13.2
 * State C; § 34.1 leaves the auto-vs-manual choice open. Slice 1 ships
 * a manual curation — three high-signal entry points that respect the
 * condition-first patient mental model.
 *
 * Labels are stored as react-intl message ids (not raw strings) so the
 * consumer formats them at render time. Keeps message extraction
 * (formatjs CLI / lingui / etc.) honest and unblocks future locales.
 */

export type RecentEntry = {
  type: "condition" | "treatment" | "etc" | "page";
  /** react-intl message id; format at render time via intl.formatMessage. */
  labelId: string;
  href: string;
};

export const RECENT_ON_LEWIS: ReadonlyArray<RecentEntry> = [
  {
    type: "condition",
    labelId: "directory.search.recent.diabetic-pn",
    href: "/conditions/diabetic-peripheral-neuropathy",
  },
  {
    type: "etc",
    labelId: "directory.search.recent.big-sky-bozeman",
    href: "/etcs/big-sky",
  },
  {
    type: "page",
    labelId: "directory.search.recent.how-it-works",
    href: "/how-it-works",
  },
];
