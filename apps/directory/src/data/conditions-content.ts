// Editorial content layer for the directory's `/conditions/:slug` pages.
// Mirrors the seed in packages/db/migrations/0018_directory_public_search.sql
// (slugs are the join key) and is loaded alongside API data in the
// ConditionDetailPage. Per directoryprd.md § 14.2 + § 27.5 + the
// slice-2 plan, copy lives here as TypeScript constants (not markdown)
// so counsel can review the prose in PR diffs and i18n extraction stays
// statically analyzable.
//
// Voice constraints (PRD § 6): plain, calm, honest, no marketing. Every
// explainer cites an authoritative public-domain source (MedlinePlus, the
// VA's National Center for PTSD, NIH/NCI). Every standard-of-care section
// for live + coming-soon conditions frames RULE 12(2)(f) as a feature
// (patients evaluate FDA-approved options first), names treatment
// CATEGORIES rather than specific brand-trade-name combinations where
// possible, and attributes its source.
//
// Adding a new condition: drop a new entry keyed by slug. The
// `conditions-content.test.ts` drift test fails CI if a published condition
// in the DB seed doesn't have a matching content entry.

export interface ExplainerContent {
  paragraphs: ReadonlyArray<string>;
  sourceLabel: string;
  sourceUrl: string;
}

export interface StandardOfCareContent {
  intro: string;
  treatments: ReadonlyArray<string>;
  closing: string;
  sourceLabel: string;
  sourceUrl: string;
}

export interface SidebarContent {
  definitions?: ReadonlyArray<{ term: string; description: string }>;
  advocacyOrgs?: ReadonlyArray<{ name: string; url: string }>;
}

export interface NotOfferedContent {
  whereElseIntro?: string;
}

export interface ConditionContent {
  explainer?: ExplainerContent;
  standardOfCare?: StandardOfCareContent;
  sidebar?: SidebarContent;
  notOffered?: NotOfferedContent;
}

const PN_FDA_APPROVED_TREATMENTS = [
  "duloxetine (an SNRI antidepressant FDA-approved for diabetic peripheral neuropathic pain)",
  "pregabalin (an anticonvulsant FDA-approved for diabetic peripheral neuropathic pain and post-herpetic neuralgia)",
  "gabapentin (an anticonvulsant commonly used off-label for neuropathic pain)",
  "topical capsaicin 8% patch (FDA-approved for post-herpetic neuralgia and used for other peripheral neuropathies)",
] as const;

const PN_AAN_GUIDELINE = {
  sourceLabel: "American Academy of Neurology — Painful Diabetic Neuropathy guideline",
  sourceUrl: "https://www.aan.com/Guidelines/Home/GuidelineDetail/1027",
};

export const CONDITION_CONTENT: Record<string, ConditionContent> = {
  "diabetic-peripheral-neuropathy": {
    explainer: {
      paragraphs: [
        "Diabetic peripheral neuropathy is nerve damage caused by chronically high blood sugar. Over time, elevated glucose injures the small blood vessels that feed peripheral nerves — most often the long nerves running to the feet and lower legs, then later the hands.",
        "Common symptoms include burning, stabbing, or shooting pain in the feet, numbness or reduced sensation, tingling, and weakness. Symptoms are often worse at night. Loss of protective sensation in the feet raises the risk of unnoticed injuries and ulceration.",
        "Roughly half of people with diabetes develop some form of peripheral neuropathy over a lifetime of disease. Tight blood-sugar control slows progression but does not reverse damage that has already occurred.",
      ],
      sourceLabel: "MedlinePlus (NIH) — Peripheral nerve disorders",
      sourceUrl: "https://medlineplus.gov/peripheralnervedisorders.html",
    },
    standardOfCare: {
      intro:
        "The FDA-approved or routinely used treatments for diabetic peripheral neuropathy in the United States today include:",
      treatments: PN_FDA_APPROVED_TREATMENTS as unknown as string[],
      closing:
        "Montana law (RULE 12(2)(f) and § 50-12-104) requires that you and your treating physician evaluate FDA-approved options first. Experimental treatments listed on Lewis are intended for patients for whom these standard treatments have not provided adequate relief.",
      sourceLabel: PN_AAN_GUIDELINE.sourceLabel,
      sourceUrl: PN_AAN_GUIDELINE.sourceUrl,
    },
    sidebar: {
      advocacyOrgs: [
        { name: "American Diabetes Association", url: "https://diabetes.org/" },
        { name: "Foundation for Peripheral Neuropathy", url: "https://www.foundationforpn.org/" },
      ],
    },
  },

  "chemotherapy-induced-peripheral-neuropathy": {
    explainer: {
      paragraphs: [
        "Chemotherapy-induced peripheral neuropathy (CIPN) is nerve damage caused by certain cancer treatments. The drugs most often associated with CIPN are platinum-based agents, taxanes, vinca alkaloids, bortezomib, and thalidomide.",
        "Symptoms typically begin in the hands and feet — tingling, numbness, burning pain, sensitivity to cold, and reduced fine-motor control. Severity ranges from mild and reversible to disabling and persistent. For a meaningful number of patients, symptoms last well beyond the end of cancer treatment.",
        "There is no proven preventive medication for CIPN. The most effective intervention available today is dose modification or substitution by the treating oncologist when symptoms emerge during chemotherapy.",
      ],
      sourceLabel: "MedlinePlus (NIH) — Peripheral neuropathy",
      sourceUrl: "https://medlineplus.gov/peripheralnervedisorders.html",
    },
    standardOfCare: {
      intro:
        "There is no FDA-approved treatment specifically indicated for CIPN. The treatments routinely used to manage CIPN symptoms in the United States today include:",
      treatments: PN_FDA_APPROVED_TREATMENTS as unknown as string[],
      closing:
        "Montana law (RULE 12(2)(f) and § 50-12-104) requires that you and your treating physician evaluate available options first. The lack of an FDA-approved treatment specifically indicated for CIPN is part of why this condition is in scope for experimental treatments.",
      sourceLabel: "ASCO — Prevention and Management of CIPN clinical practice guideline",
      sourceUrl: "https://ascopubs.org/doi/10.1200/JCO.20.01399",
    },
    sidebar: {
      advocacyOrgs: [
        { name: "American Cancer Society", url: "https://www.cancer.org/" },
        { name: "Foundation for Peripheral Neuropathy", url: "https://www.foundationforpn.org/" },
      ],
    },
  },

  "hiv-induced-peripheral-neuropathy": {
    explainer: {
      paragraphs: [
        "HIV-induced peripheral neuropathy is nerve damage that occurs in people living with HIV. Two distinct mechanisms contribute: damage from the virus itself (HIV-associated distal sensory polyneuropathy) and damage from older nucleoside-reverse-transcriptase-inhibitor antiretrovirals (ddI, d4T, ddC) — though those antiretrovirals are largely no longer used in current regimens.",
        "Common symptoms are bilateral burning, stabbing, or aching pain in the feet, numbness, and reduced touch sensation. Symptoms typically start at the toes and progress upward over months to years.",
        "Modern combination antiretroviral therapy substantially reduces but does not eliminate the risk. People who developed neuropathy on older regimens often retain symptoms even after their regimen has been updated.",
      ],
      sourceLabel: "MedlinePlus (NIH) — HIV/AIDS",
      sourceUrl: "https://medlineplus.gov/hivaids.html",
    },
    standardOfCare: {
      intro:
        "The treatments routinely used for HIV-induced peripheral neuropathy in the United States today include:",
      treatments: PN_FDA_APPROVED_TREATMENTS as unknown as string[],
      closing:
        "Montana law (RULE 12(2)(f) and § 50-12-104) requires that you and your treating physician evaluate FDA-approved options first. Adjustments to your antiretroviral regimen, where appropriate, are an additional consideration with your HIV-care team.",
      sourceLabel: PN_AAN_GUIDELINE.sourceLabel,
      sourceUrl: PN_AAN_GUIDELINE.sourceUrl,
    },
    sidebar: {
      advocacyOrgs: [
        { name: "Foundation for Peripheral Neuropathy", url: "https://www.foundationforpn.org/" },
        { name: "HIVinfo (HHS)", url: "https://hivinfo.nih.gov/" },
      ],
    },
  },

  "idiopathic-peripheral-neuropathy": {
    explainer: {
      paragraphs: [
        "Idiopathic peripheral neuropathy is nerve damage with no identified cause. After standard workup — diabetes screen, B12 and other vitamin panels, thyroid panel, immune-mediated and toxic-exposure workup — about 25% of peripheral-neuropathy cases remain idiopathic.",
        "Symptoms are similar to other peripheral neuropathies: burning, tingling, numbness, and pain in the feet, sometimes progressing to the hands. Onset is typically in the 50s or later. Progression is usually slow.",
        'The diagnosis of "idiopathic" is one of exclusion. Periodic re-evaluation is appropriate — sometimes a cause emerges later, particularly autoimmune conditions or paraproteinemias that can take years to manifest.',
      ],
      sourceLabel: "MedlinePlus (NIH) — Peripheral neuropathy",
      sourceUrl: "https://medlineplus.gov/peripheralnervedisorders.html",
    },
    standardOfCare: {
      intro:
        "The treatments routinely used for idiopathic peripheral neuropathy in the United States today include:",
      treatments: PN_FDA_APPROVED_TREATMENTS as unknown as string[],
      closing:
        "Montana law (RULE 12(2)(f) and § 50-12-104) requires that you and your treating physician evaluate available options first. For idiopathic neuropathy in particular, periodic re-evaluation for an emergent underlying cause is a parallel step.",
      sourceLabel: PN_AAN_GUIDELINE.sourceLabel,
      sourceUrl: PN_AAN_GUIDELINE.sourceUrl,
    },
    sidebar: {
      advocacyOrgs: [
        { name: "Foundation for Peripheral Neuropathy", url: "https://www.foundationforpn.org/" },
      ],
    },
  },

  ptsd: {
    explainer: {
      paragraphs: [
        "Post-traumatic stress disorder (PTSD) is a psychiatric condition that may develop after exposure to a traumatic event — combat, assault, serious accident, disaster, or witness to violent injury or death. Roughly 6% of U.S. adults will experience PTSD at some point in their lifetime.",
        "Core symptoms include intrusive memories or flashbacks, avoidance of trauma reminders, persistent negative changes in thought and mood, and alterations in arousal and reactivity (hypervigilance, sleep disturbance, irritability). To meet diagnostic criteria, symptoms must persist for more than one month and cause significant distress or functional impairment.",
        "PTSD is treatable. The most-evidence-supported treatments combine trauma-focused psychotherapy with, in many cases, an FDA-approved medication. Recovery trajectories vary widely; some people improve substantially, others manage symptoms long-term.",
      ],
      sourceLabel: "National Center for PTSD (U.S. Department of Veterans Affairs)",
      sourceUrl: "https://www.ptsd.va.gov/",
    },
    standardOfCare: {
      intro:
        "The FDA-approved or routinely used first-line treatments for PTSD in the United States today include:",
      treatments: [
        "trauma-focused psychotherapy — Cognitive Processing Therapy (CPT), Prolonged Exposure (PE), or Eye Movement Desensitization and Reprocessing (EMDR)",
        "sertraline (Zoloft) — FDA-approved for PTSD",
        "paroxetine (Paxil) — FDA-approved for PTSD",
        "venlafaxine (Effexor) — used off-label for PTSD with strong supporting evidence",
      ],
      closing:
        "Montana law (RULE 12(2)(f) and § 50-12-104) requires that you and your treating physician evaluate FDA-approved options first. Trauma-focused psychotherapy is the highest-evidence first-line treatment; medications are typically used in combination with therapy.",
      sourceLabel: "VA/DoD Clinical Practice Guideline for the Management of PTSD",
      sourceUrl: "https://www.healthquality.va.gov/guidelines/MH/ptsd/",
    },
    sidebar: {
      advocacyOrgs: [
        { name: "National Center for PTSD (VA)", url: "https://www.ptsd.va.gov/" },
        { name: "PTSD Alliance", url: "https://www.ptsdalliance.org/" },
        { name: "988 Suicide & Crisis Lifeline", url: "https://988lifeline.org/" },
      ],
    },
  },

  als: {
    explainer: {
      paragraphs: [
        "Amyotrophic Lateral Sclerosis (ALS) is a progressive neurodegenerative disease that attacks motor neurons — the nerve cells in the brain and spinal cord that control voluntary muscle movement.",
        "Early symptoms include muscle weakness, twitching, and stiffness, typically starting in the hands, feet, or speech and swallowing. As motor neurons die, voluntary muscle control is progressively lost. Cognition is usually preserved.",
        "Average life expectancy after diagnosis is two to five years, though some people live considerably longer. There is no cure today; available FDA-approved treatments slow progression modestly. Active research includes gene therapies, stem-cell approaches, and investigational small molecules.",
      ],
      sourceLabel: "MedlinePlus (NIH) — Amyotrophic Lateral Sclerosis",
      sourceUrl: "https://medlineplus.gov/amyotrophiclateralsclerosis.html",
    },
    notOffered: {
      whereElseIntro:
        "ALS has been a focus of U.S. clinical research for decades. ClinicalTrials.gov lists a substantial number of active studies in this condition.",
    },
    sidebar: {
      advocacyOrgs: [
        { name: "ALS Association", url: "https://www.als.org/" },
        { name: "I AM ALS", url: "https://www.iamals.org/" },
        { name: "Muscular Dystrophy Association — ALS", url: "https://www.mda.org/disease/als" },
      ],
    },
  },

  "multiple-sclerosis": {
    explainer: {
      paragraphs: [
        "Multiple sclerosis (MS) is a chronic autoimmune condition in which the immune system attacks the myelin sheath that insulates nerve fibers in the brain and spinal cord. The damage interrupts nerve signals and can cause a wide range of neurological symptoms.",
        "Symptoms vary widely between people and over time. Common ones include vision changes, numbness or weakness in limbs, fatigue, balance problems, bladder dysfunction, and cognitive difficulty. Most people experience relapsing-remitting MS, with episodes of new symptoms followed by partial or complete recovery.",
        "More than 20 disease-modifying therapies are FDA-approved for MS, ranging from oral medications to infusions. Treatment selection depends on disease activity, MRI findings, side-effect profile, and personal preference.",
      ],
      sourceLabel: "MedlinePlus (NIH) — Multiple Sclerosis",
      sourceUrl: "https://medlineplus.gov/multiplesclerosis.html",
    },
    notOffered: {
      whereElseIntro:
        "Multiple sclerosis has a large active research footprint. ClinicalTrials.gov lists hundreds of MS studies at any given time.",
    },
    sidebar: {
      advocacyOrgs: [
        { name: "National Multiple Sclerosis Society", url: "https://www.nationalmssociety.org/" },
      ],
    },
  },

  "rare-cancers": {
    explainer: {
      paragraphs: [
        '"Rare cancers" is an umbrella term for cancers with low incidence — often defined as fewer than six cases per 100,000 people per year. Together, rare cancers account for roughly 25% of all cancer diagnoses, even though each individual rare cancer is uncommon.',
        "Rare cancers can be challenging to treat: standard-of-care guidance is often less developed than for common cancers, large randomized trials are scarce, and specialist expertise may be concentrated at a small number of cancer centers.",
        "Lewis lists this category as a placeholder for future, condition-specific listings as Montana ETCs onboard programs targeting specific rare cancers. Today no such program is offered in Montana.",
      ],
      sourceLabel: "National Cancer Institute (NIH) — Types of Cancer",
      sourceUrl: "https://www.cancer.gov/types",
    },
    notOffered: {
      whereElseIntro:
        'ClinicalTrials.gov supports filtering by specific cancer type. Searching by your specific cancer name (rather than the umbrella "rare cancers") will yield more relevant results.',
    },
    sidebar: {
      advocacyOrgs: [
        { name: "National Cancer Institute (NIH)", url: "https://www.cancer.gov/" },
        { name: "American Cancer Society", url: "https://www.cancer.org/" },
        { name: "Rare Cancers Australia", url: "https://www.rarecancers.org.au/" },
      ],
    },
  },

  "autoimmune-diseases": {
    explainer: {
      paragraphs: [
        '"Autoimmune diseases" is an umbrella term for conditions in which the immune system attacks the body\'s own tissues. There are more than 80 distinct autoimmune diseases, including type 1 diabetes, rheumatoid arthritis, lupus, multiple sclerosis, inflammatory bowel disease, and many less common conditions.',
        "Symptoms vary enormously by disease and by individual. Most autoimmune diseases are chronic and progress with relapsing-remitting or steadily progressive courses. Treatment usually combines disease-modifying medications with management of specific complications.",
        "Lewis lists this category as a placeholder for future, condition-specific listings as Montana ETCs onboard programs targeting specific autoimmune diseases. Today no such program is offered in Montana.",
      ],
      sourceLabel: "MedlinePlus (NIH) — Autoimmune Diseases",
      sourceUrl: "https://medlineplus.gov/autoimmunediseases.html",
    },
    notOffered: {
      whereElseIntro:
        'ClinicalTrials.gov supports filtering by specific autoimmune disease. Searching by your specific diagnosis (rather than the umbrella "autoimmune diseases") will yield more relevant results.',
    },
    sidebar: {
      advocacyOrgs: [
        {
          name: "American Autoimmune Related Diseases Association",
          url: "https://autoimmune.org/",
        },
        {
          name: "MedlinePlus — Autoimmune Diseases",
          url: "https://medlineplus.gov/autoimmunediseases.html",
        },
      ],
    },
  },
};

export function getConditionContent(slug: string): ConditionContent | undefined {
  return CONDITION_CONTENT[slug];
}
