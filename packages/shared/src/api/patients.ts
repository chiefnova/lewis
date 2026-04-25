import { z } from "zod";

import { cursorPage } from "./pagination.js";

export const PatientMeResponse = z.object({
  treatmentStatus: z.string().nullable(),
  // tasks is a small bounded list of open patient tasks, not paginated.
  tasks: z.array(z.unknown()),
});
export type PatientMeResponse = z.infer<typeof PatientMeResponse>;

export const PatientMessagesResponse = cursorPage(z.unknown());
export type PatientMessagesResponse = z.infer<typeof PatientMessagesResponse>;

export const PatientDocumentsResponse = cursorPage(z.unknown());
export type PatientDocumentsResponse = z.infer<typeof PatientDocumentsResponse>;
