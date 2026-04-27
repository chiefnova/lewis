import { getDatabasePool, setAppContext, type PoolClient } from "@lewis/db";
import type { MiddlewareHandler } from "hono";

import { ApiError } from "./errors.js";
import type { AuthenticatedTenantVariables } from "./tenant.js";

/**
 * withDbContext — acquires a per-request PoolClient, BEGINs a transaction,
 * sets the app.* RLS session variables via setAppContext, exposes the
 * client on c.var.dbClient for handlers, then COMMITs or ROLLBACKs based
 * on whether the handler threw.
 *
 * Handlers MUST use c.var.dbClient for any query that needs RLS context.
 * Going through the pool directly bypasses the app.* settings and will
 * silently return zero rows from RLS-gated tables.
 *
 * Connection lifecycle is strictly managed: every code path releases the
 * client. Transaction state is verified — a handler that calls c.var.dbClient
 * outside the transaction won't see the app.* settings, so the policy will
 * deny.
 */

type DbContextVariables = AuthenticatedTenantVariables & {
  dbClient: PoolClient;
};

export const withDbContext: MiddlewareHandler<{ Variables: DbContextVariables }> = async (
  c,
  next,
) => {
  const appContext = c.get("appContext");
  if (!appContext) {
    throw new ApiError("internal_error", "withDbContext ran before resolveTenant");
  }

  const pool = getDatabasePool();
  const client = await pool.connect();

  let resolution: "committed" | "rolled-back" | "pending" = "pending";
  try {
    await client.query("begin");
    await setAppContext(client, appContext);
    c.set("dbClient", client);

    await next();

    // Commit only on 2xx. 4xx/5xx → rollback. Handlers that need to commit
    // alongside a 4xx response (e.g. write-then-return-validation-error)
    // should run their own explicit COMMIT before returning.
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
      // already in error path; swallow rollback failure to surface the original
    }
    throw error;
  } finally {
    if (resolution === "pending") {
      // Belt-and-suspenders: if we somehow exited try/catch without resolving
      // the txn (e.g. catch's rollback also threw), force rollback.
      try {
        await client.query("rollback");
      } catch {
        // ignore — connection is being released either way
      }
    }
    client.release();
  }
};

export type AuthenticatedDbVariables = DbContextVariables;
