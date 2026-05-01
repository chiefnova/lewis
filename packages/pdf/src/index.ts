// PDF rendering surface for Lewis. Templates are declared here and bound to
// concrete renderers in ./render.ts (Puppeteer + the HTML template files
// under ./templates/).
//
// Slice 3 ships `program_brief` — a single-page editorial brief for the
// public directory. The other templates are stubs awaiting their own slices
// (patient_agreement → connect form work, ae_report → AE workflow, etc.).
export type PdfTemplate =
  | "license_application"
  | "patient_agreement"
  | "ae_report"
  | "hfar"
  | "dphhs_annual"
  | "etrb_annual"
  | "pp_manual"
  | "program_brief";

export type PdfRenderRequest = {
  template: PdfTemplate;
  tenantId: string;
  sourceObjectType: string;
  sourceObjectId: string;
};
