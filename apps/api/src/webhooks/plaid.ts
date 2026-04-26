import { createHash, timingSafeEqual } from "node:crypto";

import { requiredEnv } from "@lewis/shared";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  type WebhookVerificationKeyGetResponse,
} from "plaid";

import { ApiError } from "../middleware/errors.js";

/**
 * Plaid webhook signature verification.
 *
 * Plaid signs webhooks with a JWT in the `Plaid-Verification` header. The
 * verification flow per Plaid docs:
 *
 *   1. Decode JWT header (no signature check yet) to get `kid`.
 *   2. Fetch the corresponding JWK from /webhook_verification_key/get.
 *   3. Verify JWT signature with that JWK (ES256).
 *   4. Confirm the JWT's `request_body_sha256` claim matches SHA-256 of the
 *      raw request body.
 *   5. Confirm `iat` (issued-at) is within 5 minutes — replay protection.
 *
 * Verification keys are cached in-memory keyed by `kid` and refreshed on miss.
 *
 * Throws ApiError("forbidden") on any verification failure.
 */
const KEY_CACHE = new Map<string, WebhookVerificationKeyGetResponse["key"]>();
const MAX_AGE_SECONDS = 5 * 60;

let plaidSingleton: PlaidApi | undefined;
function getPlaidClient(): PlaidApi {
  if (!plaidSingleton) {
    const env = (process.env.PLAID_ENV ?? "sandbox") as keyof typeof PlaidEnvironments;
    const basePath = PlaidEnvironments[env];
    if (!basePath) {
      throw new ApiError(
        "internal_error",
        `unknown PLAID_ENV '${env}'; expected sandbox|production`,
      );
    }
    const config = new Configuration({
      basePath,
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": requiredEnv("PLAID_CLIENT_ID"),
          "PLAID-SECRET": requiredEnv("PLAID_SECRET"),
        },
      },
    });
    plaidSingleton = new PlaidApi(config);
  }
  return plaidSingleton;
}

async function getVerificationKey(kid: string): Promise<WebhookVerificationKeyGetResponse["key"]> {
  const cached = KEY_CACHE.get(kid);
  if (cached) return cached;

  const response = await getPlaidClient().webhookVerificationKeyGet({ key_id: kid });
  const key = response.data.key;
  if (key.expired_at) {
    throw new ApiError("forbidden", "plaid webhook verification key is expired");
  }
  KEY_CACHE.set(kid, key);
  return key;
}

export async function verifyPlaidWebhook(rawBody: string, headers: Headers): Promise<unknown> {
  const token = headers.get("plaid-verification");
  if (!token) {
    throw new ApiError("forbidden", "missing plaid-verification header");
  }

  let kid: string | undefined;
  let alg: string | undefined;
  try {
    const protectedHeader = decodeProtectedHeader(token);
    kid = protectedHeader.kid;
    alg = protectedHeader.alg;
  } catch {
    throw new ApiError("forbidden", "plaid-verification header is not a parseable JWT");
  }
  if (!kid || alg !== "ES256") {
    throw new ApiError("forbidden", "plaid webhook JWT must use ES256 with a kid");
  }

  const key = await getVerificationKey(kid);
  const cryptoKey = await importJWK(
    {
      kty: key.kty,
      crv: key.crv,
      x: key.x,
      y: key.y,
      use: key.use,
    },
    alg,
  );

  let claims: { request_body_sha256?: unknown; iat?: number };
  try {
    const { payload } = await jwtVerify(token, cryptoKey, { algorithms: ["ES256"] });
    claims = payload as typeof claims;
  } catch {
    throw new ApiError("forbidden", "plaid webhook JWT signature invalid");
  }

  // Replay-protection window.
  const issuedAt = typeof claims.iat === "number" ? claims.iat : 0;
  const ageSeconds = Math.floor(Date.now() / 1000) - issuedAt;
  if (ageSeconds > MAX_AGE_SECONDS || ageSeconds < -30) {
    throw new ApiError("forbidden", `plaid webhook JWT outside replay window (age=${ageSeconds}s)`);
  }

  // Body integrity: claim `request_body_sha256` must equal SHA-256(rawBody).
  const claimedHash = claims.request_body_sha256;
  if (typeof claimedHash !== "string" || claimedHash.length !== 64) {
    throw new ApiError("forbidden", "plaid webhook JWT missing request_body_sha256 claim");
  }
  const computedHash = createHash("sha256").update(rawBody).digest("hex");
  const claimedBuf = Buffer.from(claimedHash, "hex");
  const computedBuf = Buffer.from(computedHash, "hex");
  if (claimedBuf.length !== computedBuf.length || !timingSafeEqual(claimedBuf, computedBuf)) {
    throw new ApiError("forbidden", "plaid webhook body hash does not match JWT claim");
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new ApiError("unprocessable", "plaid webhook body is not valid JSON");
  }
}
