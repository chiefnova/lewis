export type PdfTemplate =
  | "license_application"
  | "patient_agreement"
  | "ae_report"
  | "hfar"
  | "dphhs_annual"
  | "etrb_annual"
  | "pp_manual";

export type PdfRenderRequest = {
  template: PdfTemplate;
  tenantId: string;
  sourceObjectType: string;
  sourceObjectId: string;
};
