import { z } from "zod";

/**
 * Cursor pagination contract for all list endpoints.
 *
 * The cursor is opaque to the client — it's whatever the server stuffs in
 * (typically a base64-encoded `(created_at, id)` tuple). Server promises only
 * that it's stable and safe to round-trip.
 */
export const CursorPageQuery = z.object({
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type CursorPageQuery = z.infer<typeof CursorPageQuery>;

/**
 * Build a CursorPage<T> schema for a given item schema. Use:
 *   const ManufacturerListResponse = cursorPage(ManufacturerSchema)
 */
export function cursorPage<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  });
}

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};
