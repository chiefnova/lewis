/**
 * Curated "Recent on Lewis" list shown in the empty-query state of the
 * search overlay and search results page. Per directoryprd.md § 13.2
 * State C; § 34.1 leaves the auto-vs-manual choice open. Slice 1 ships
 * a manual curation — three high-signal entry points that respect the
 * condition-first patient mental model.
 */

export type RecentEntry = {
  type: "condition" | "treatment" | "etc" | "page";
  label: string;
  href: string;
};

export const RECENT_ON_LEWIS: ReadonlyArray<RecentEntry> = [
  {
    type: "condition",
    label: "Diabetic peripheral neuropathy",
    href: "/conditions/diabetic-peripheral-neuropathy",
  },
  {
    type: "etc",
    label: "Big Sky ETC, Bozeman",
    href: "/etcs/big-sky",
  },
  {
    type: "page",
    label: "How Montana's program works",
    href: "/how-it-works",
  },
];
