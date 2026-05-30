import {
  EligibilityAnswerRequest,
  EligibilityAnswerResponse,
  EligibilityCompleteRequest,
  EligibilityCompleteResponse,
  EligibilityResumeResponse,
  EligibilityStartRequest,
  EligibilityStartResponse,
} from "@lewis/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { respondWithError } from "../../middleware/errors.js";
import type { PublicDbContextVars } from "../../middleware/public-context.js";
import { logger } from "../../logger.js";

/**
 * Anonymous eligibility-session endpoints (slice 5 § 17.2 / 17.3 / 17.4).
 *
 *   POST /v1/public/eligibility/start
 *     → mints a session token + expiresAt for a given program slug
 *
 *   POST /v1/public/eligibility/sessions/:token/answers
 *     → appends { questionId, value } into the answers JSONB
 *
 *   POST /v1/public/eligibility/sessions/:token/complete
 *     → closes the session with the final pass/fail outcome.
 *       For failed sessions the request carries the user-facing
 *       failed_criterion text rendered by the § 17.4 fail-branch UI
 *       ("...the program requires a confirmed diabetic peripheral
 *       neuropathy diagnosis from a treating physician.").
 *
 *   GET  /v1/public/eligibility/sessions/:token
 *     → resume-on-return: returns the persisted state if the session
 *       is still valid (not expired). Returns 404 on expired/unknown
 *       so the client can render a single "expired" UI without leaking
 *       which case it was.
 *
 * All three writes go through SECURITY DEFINER helpers added in
 * migration 0021 — directory_anonymous has no direct INSERT/SELECT
 * path on eligibility_sessions. Reads are admin-only.
 *
 * The question manifest itself lives client-side in
 * apps/directory/src/data/eligibility.ts; the server only owns the
 * session token + persistence + decision audit trail.
 */

const TokenParam = z.object({ token: z.string().uuid() });

type StartRow = {
  token: string;
  expires_at: Date | string;
};

type BoolFnRow<K extends string> = Record<K, boolean>;

type ResumeRow = {
  program_slug: string;
  answers: Record<string, string> | string | null;
  status: "in_progress" | "passed" | "failed";
  failed_criterion: string | null;
  expires_at: Date | string;
};

export const publicEligibilityRoutes = new Hono<{ Variables: PublicDbContextVars }>();

// ---------------------------------------------------------------------------
// POST /start — mint a session.
// ---------------------------------------------------------------------------

publicEligibilityRoutes.post(
  "/start",
  zValidator("json", EligibilityStartRequest, (result, c) => {
    if (!result.success) {
      return respondWithError(
        c,
        "validation_error",
        "Invalid eligibility start request.",
        result.error.flatten(),
      );
    }
  }),
  async (c) => {
    const db = c.var.dbClient;
    const requestId = c.var.requestId ?? "unknown";
    const { programSlug } = c.req.valid("json");

    const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null;
    const ua = c.req.header("user-agent")?.slice(0, 500) ?? null;

    let row: StartRow | undefined;
    try {
      const result = await db.query<StartRow>(
        `select token, expires_at
           from app.directory_eligibility_start($1, $2::inet, $3)`,
        [programSlug, ip ? ip.split(",")[0]?.trim() : null, ua],
      );
      row = result.rows[0];
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "unknown start error";
      logger.error(
        { requestId, route: "/v1/public/eligibility/start", programSlug, message },
        "eligibility start failed",
      );
      return respondWithError(c, "internal_error", "Eligibility start failed.");
    }

    // Helper returns zero rows on unknown / unpublished program. The API
    // surfaces that as a 404 so the client can render "program not found"
    // rather than a generic 500.
    if (!row) {
      return respondWithError(c, "not_found", "Program not found or not published.");
    }

    const expiresAtIso =
      row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at);

    logger.info(
      { requestId, route: "/v1/public/eligibility/start", programSlug },
      "eligibility session created",
    );

    return c.json(
      EligibilityStartResponse.parse({
        sessionToken: row.token,
        programSlug,
        expiresAt: expiresAtIso,
      }),
    );
  },
);

// ---------------------------------------------------------------------------
// POST /sessions/:token/answers — append one answer.
// ---------------------------------------------------------------------------

publicEligibilityRoutes.post(
  "/sessions/:token/answers",
  zValidator("param", TokenParam, (result, c) => {
    if (!result.success) {
      return respondWithError(
        c,
        "validation_error",
        "Invalid session token.",
        result.error.flatten(),
      );
    }
  }),
  zValidator("json", EligibilityAnswerRequest, (result, c) => {
    if (!result.success) {
      return respondWithError(
        c,
        "validation_error",
        "Invalid eligibility answer.",
        result.error.flatten(),
      );
    }
  }),
  async (c) => {
    const db = c.var.dbClient;
    const requestId = c.var.requestId ?? "unknown";
    const { token } = c.req.valid("param");
    const { questionId, value } = c.req.valid("json");

    let accepted = false;
    try {
      const result = await db.query<BoolFnRow<"directory_eligibility_append_answer">>(
        `select app.directory_eligibility_append_answer($1::uuid, $2, $3)
           as directory_eligibility_append_answer`,
        [token, questionId, value],
      );
      accepted = result.rows[0]?.directory_eligibility_append_answer ?? false;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "unknown answer error";
      logger.error(
        { requestId, route: "/v1/public/eligibility/sessions/answers", questionId, message },
        "eligibility append-answer failed",
      );
      return respondWithError(c, "internal_error", "Eligibility update failed.");
    }

    // Helper returns false on expired / unknown / already-completed. The
    // client should treat this as "session expired, please restart" — the
    // exact distinction is intentionally hidden.
    if (!accepted) {
      return respondWithError(c, "not_found", "Eligibility session expired or not found.");
    }

    return c.json(EligibilityAnswerResponse.parse({ accepted: true }));
  },
);

// ---------------------------------------------------------------------------
// POST /sessions/:token/complete — close the session.
// ---------------------------------------------------------------------------

publicEligibilityRoutes.post(
  "/sessions/:token/complete",
  zValidator("param", TokenParam, (result, c) => {
    if (!result.success) {
      return respondWithError(
        c,
        "validation_error",
        "Invalid session token.",
        result.error.flatten(),
      );
    }
  }),
  zValidator("json", EligibilityCompleteRequest, (result, c) => {
    if (!result.success) {
      return respondWithError(
        c,
        "validation_error",
        "Invalid eligibility completion request.",
        result.error.flatten(),
      );
    }
  }),
  async (c) => {
    const db = c.var.dbClient;
    const requestId = c.var.requestId ?? "unknown";
    const { token } = c.req.valid("param");
    const { passed, failedCriterion } = c.req.valid("json");

    // Cross-field rule: failed must have a reason, passed must not.
    // The DB helper enforces this in plpgsql, but rejecting at the API
    // layer gives a clean 400 + clear message rather than surfacing a
    // P0001 raise.
    if (passed && failedCriterion !== null) {
      return respondWithError(
        c,
        "validation_error",
        "failedCriterion must be null when passed=true.",
      );
    }
    if (!passed && (failedCriterion === null || failedCriterion.trim().length === 0)) {
      return respondWithError(
        c,
        "validation_error",
        "failedCriterion is required when passed=false.",
      );
    }

    let completed = false;
    try {
      const result = await db.query<BoolFnRow<"directory_eligibility_complete">>(
        `select app.directory_eligibility_complete($1::uuid, $2, $3)
           as directory_eligibility_complete`,
        [token, passed, failedCriterion],
      );
      completed = result.rows[0]?.directory_eligibility_complete ?? false;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "unknown complete error";
      // Helper raises P0001 if the cross-field rule is violated (we've
      // already validated above, but defense-in-depth). Either way the
      // session is unsuitable; 400.
      const code = (caught as { code?: unknown } | null)?.code;
      if (code === "P0001") {
        logger.warn(
          { requestId, route: "/v1/public/eligibility/sessions/complete", message },
          "eligibility complete rejected by db helper validation",
        );
        return respondWithError(c, "validation_error", "Invalid eligibility completion request.");
      }
      logger.error(
        { requestId, route: "/v1/public/eligibility/sessions/complete", pgCode: code, message },
        "eligibility complete failed (non-validation db error)",
      );
      return respondWithError(c, "internal_error", "Eligibility completion failed.");
    }

    if (!completed) {
      return respondWithError(c, "not_found", "Eligibility session expired or already completed.");
    }

    logger.info(
      {
        requestId,
        route: "/v1/public/eligibility/sessions/complete",
        result: passed ? "passed" : "failed",
      },
      "eligibility session completed",
    );

    return c.json(
      EligibilityCompleteResponse.parse({
        sessionToken: token,
        result: passed ? "passed" : "failed",
        failedCriterion,
      }),
    );
  },
);

// ---------------------------------------------------------------------------
// GET /sessions/:token — resume-on-return.
// ---------------------------------------------------------------------------

publicEligibilityRoutes.get(
  "/sessions/:token",
  zValidator("param", TokenParam, (result, c) => {
    if (!result.success) {
      return respondWithError(
        c,
        "validation_error",
        "Invalid session token.",
        result.error.flatten(),
      );
    }
  }),
  async (c) => {
    const db = c.var.dbClient;
    const requestId = c.var.requestId ?? "unknown";
    const { token } = c.req.valid("param");

    let row: ResumeRow | undefined;
    try {
      const result = await db.query<ResumeRow>(
        `select program_slug, answers, status, failed_criterion, expires_at
           from app.directory_eligibility_resume($1::uuid)`,
        [token],
      );
      row = result.rows[0];
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "unknown resume error";
      logger.error(
        { requestId, route: "/v1/public/eligibility/sessions", message },
        "eligibility resume failed",
      );
      return respondWithError(c, "internal_error", "Eligibility resume failed.");
    }

    if (!row) {
      return respondWithError(c, "not_found", "Eligibility session expired or not found.");
    }

    // Postgres returns jsonb as a JS object via node-postgres; defensive
    // shim handles a server that returns it as a string.
    const answers =
      typeof row.answers === "string"
        ? (JSON.parse(row.answers) as Record<string, string>)
        : (row.answers ?? {});

    const expiresAtIso =
      row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at);

    return c.json(
      EligibilityResumeResponse.parse({
        programSlug: row.program_slug,
        answers,
        status: row.status,
        failedCriterion: row.failed_criterion,
        expiresAt: expiresAtIso,
      }),
    );
  },
);
