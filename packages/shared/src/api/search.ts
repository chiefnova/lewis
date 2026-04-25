import { z } from "zod";

import { cursorPage } from "./pagination.js";

export const SearchQueryParams = z.object({
  q: z.string().trim().min(1).max(200),
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchQueryParams = z.infer<typeof SearchQueryParams>;

export const SearchResponse = z.object({
  query: z.string(),
  ...cursorPage(z.unknown()).shape,
});
export type SearchResponse = z.infer<typeof SearchResponse>;
