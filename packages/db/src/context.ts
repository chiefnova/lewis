import { AppContextSchema, type AppContext } from "@corridor/shared";
import type { PoolClient } from "pg";

export type TransactionHandler<T> = (client: PoolClient) => Promise<T>;

/**
 * Thrown when AppContext validation fails at the trust boundary. Callers
 * should catch this and translate to a 500 — a malformed AppContext at this
 * point indicates a programming error in the middleware that built it, not
 * a client error.
 */
export class InvalidAppContextError extends Error {
  readonly issues: unknown;

  constructor(issues: unknown) {
    super("AppContext failed validation at the DB trust boundary");
    this.name = "InvalidAppContextError";
    this.issues = issues;
  }
}

export async function setAppContext(client: PoolClient, context: AppContext): Promise<void> {
  // Validate at the trust boundary. Cheap, clear failure mode, prevents
  // confusing 500s inside policy evaluation when a malformed value is
  // passed through from the middleware.
  const parsed = AppContextSchema.safeParse(context);
  if (!parsed.success) {
    throw new InvalidAppContextError(parsed.error.issues);
  }

  const validated = parsed.data;

  await client.query("select set_config('app.user_id', $1, true)", [validated.userId]);
  await client.query("select set_config('app.active_tenant_id', $1, true)", [
    validated.activeTenantId,
  ]);
  await client.query("select set_config('app.role', $1, true)", [validated.role]);
  await client.query("select set_config('app.request_id', $1, true)", [validated.requestId]);

  if (validated.supportTicketId) {
    await client.query("select set_config('app.support_ticket_id', $1, true)", [
      validated.supportTicketId,
    ]);
  }
}

export async function withAppContext<T>(
  client: PoolClient,
  context: AppContext,
  handler: TransactionHandler<T>,
): Promise<T> {
  await client.query("begin");
  try {
    await setAppContext(client, context);
    const result = await handler(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}
