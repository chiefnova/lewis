import { z } from "zod";

import { cursorPage } from "./pagination.js";
import { BoardId } from "./ids.js";

export const BoardPathParams = z.object({
  boardId: BoardId,
});
export type BoardPathParams = z.infer<typeof BoardPathParams>;

export const BoardProtocolReviewsResponse = z.object({
  boardId: BoardId,
  ...cursorPage(z.unknown()).shape,
});
export type BoardProtocolReviewsResponse = z.infer<typeof BoardProtocolReviewsResponse>;

export const BoardAnnualReportResponse = z.object({
  boardId: BoardId,
  // Annual report is a single artifact, not a list — no pagination.
  report: z.unknown().nullable(),
});
export type BoardAnnualReportResponse = z.infer<typeof BoardAnnualReportResponse>;
