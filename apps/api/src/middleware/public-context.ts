import { getDatabasePool, type PoolClient } from "@lewis/db";
import type { MiddlewareHandler } from "hono";

/**
 * withPublicDbContext — opens a per-request transaction with the
 * `app.role = 'directory_anonymous'` session var set, exposes the client
 * on c.var.dbClient, and COMMIT/ROLLBACKs based on response status.
 *
 * Sibling of withDbContext, but for the anonymous /v1/public/* surface:
 * no Clerk auth, no tenant resolution, no app.user_id. Public-read RLS
 * policies (added in 0018) gate on the role string PLUS each row's
 * published flag — see plans/immutable-squishing-sprout.md
 * "Architecture decisions § 1".
 *
 * This is NOT a service-role bypass. The runtime role stays app_api
 * (NOBYPASSRLS per migration 0011); the role string is just a transaction-
 * local variable that the public-read policies match against. Default-deny
 * is enforced when the variable is unset (asserted in
 * test/rls/0018_directory_public_search.sql).
 *
 * Connection lifecycle mirrors withDbContext: try/catch/finally with
 * explicit release. Commit on 2xx, rollback on 4xx/5xx, belt-and-suspenders
 * rollback if the resolution slot is somehow left pending.
 */

type PublicDbContextVariables = {
  requestId: string;
  dbClient: PoolClient;
};

const ANONYMOUS_ROLE = "directory_anonymous";

export const withPublicDbContext: MiddlewareHandler<{
  Variables: PublicDbContextVariables;
}> = async (c, next) => {
  const requestId = c.get("requestId");
  const pool = getDatabasePool();
  const client = await pool.connect();

  let resolution: "committed" | "rolled-back" | "pending" = "pending";
  try {
    await client.query("begin");
    // Transaction-local set_config (third arg = true). Auto-resets on
    // commit/rollback so the next request through the same pooled
    // connection starts with no app.* state set.
    await client.query("select set_config('app.role', $1, true)", [ANONYMOUS_ROLE]);
    if (requestId) {
      await client.query("select set_config('app.request_id', $1, true)", [requestId]);
    }
    c.set("dbClient", client);

    await next();

    const status = c.res.status;
    if (status >= 200 && status < 300) {
      await client.query("commit");
      resolution = "committed";
    } else {
      await client.query("rollback");
      resolution = "rolled-back";
    }
  } catch (error) {
    try {
      await client.query("rollback");
      resolution = "rolled-back";
    } catch {
      // already in error path; the original throw is the priority signal
    }
    throw error;
  } finally {
    if (resolution === "pending") {
      try {
        await client.query("rollback");
      } catch {
        // ignore — connection is being released either way
      }
    }
    client.release();
  }
};

export type PublicDbContextVars = PublicDbContextVariables;
