import { createClerkClient, verifyToken } from "@clerk/backend";
import { requiredEnv } from "@corridor/shared";
import type { MiddlewareHandler } from "hono";

import { ApiError } from "./errors.js";

/**
 * requireClerkAuth — verifies the Clerk session JWT presented in either:
 *   - Authorization: Bearer <token>
 *   - __session cookie (fallback for browser clients)
 *
 * On success, stores `clerkUserId` on the Hono context. On failure, throws
 * ApiError("unauthenticated").
 *
 * The downstream resolveTenant middleware turns clerkUserId into a Corridor
 * users.id by looking it up in the database — that's where we cross the
 * Clerk → Corridor identity boundary.
 */

type AuthVariables = {
  clerkUserId: string;
};

let clerkClientSingleton: ReturnType<typeof createClerkClient> | undefined;
function getClerkClient() {
  if (!clerkClientSingleton) {
    clerkClientSingleton = createClerkClient({
      secretKey: requiredEnv("CLERK_SECRET_KEY"),
    });
  }
  return clerkClientSingleton;
}

function extractSessionToken(headers: Headers): string | undefined {
  const authorization = headers.get("authorization");
  if (authorization) {
    const match = /^Bearer\s+(\S+)$/.exec(authorization);
    if (match?.[1]) return match[1];
  }

  const cookieHeader = headers.get("cookie");
  if (cookieHeader) {
    for (const part of cookieHeader.split(";")) {
      const [rawName, ...rawValue] = part.trim().split("=");
      if (rawName === "__session" && rawValue.length > 0) {
        return decodeURIComponent(rawValue.join("="));
      }
    }
  }

  return undefined;
}

export const requireClerkAuth: MiddlewareHandler<{ Variables: AuthVariables }> = async (
  c,
  next,
) => {
  const token = extractSessionToken(c.req.raw.headers);
  if (!token) {
    throw new ApiError(
      "unauthenticated",
      "missing clerk session token (Authorization: Bearer <token> or __session cookie)",
    );
  }

  let clerkUserId: string;
  try {
    const verified = await verifyToken(token, {
      secretKey: requiredEnv("CLERK_SECRET_KEY"),
      audience: process.env.CLERK_JWT_AUDIENCE,
      authorizedParties: process.env.CLERK_AUTHORIZED_PARTIES?.split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    if (!verified.sub) {
      throw new Error("verified token missing subject");
    }
    clerkUserId = verified.sub;
  } catch {
    throw new ApiError("unauthenticated", "clerk session token verification failed");
  }

  c.set("clerkUserId", clerkUserId);
  await next();
};

export type AuthenticatedClerkVariables = AuthVariables;

// Re-export so other modules can plumb the clerk client without re-importing
// the lazy getter machinery.
export { getClerkClient };
