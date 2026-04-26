/**
 * Shared local-development safety guards for the @lewis/db scripts.
 *
 * Both seed-dev.ts and setup-local-runtime-roles.ts make destructive changes
 * to a Postgres database (insert synthetic data, alter role passwords). They
 * must NEVER run against staging or production. The guards live here so the
 * allowlists drift in lockstep — touching one file used to leave the other
 * silently weaker.
 */

export const ALLOWED_NODE_ENVS: ReadonlySet<string> = new Set(["development", "test"]);

export const ALLOWED_HOST_LITERALS: ReadonlySet<string> = new Set([
  "127.0.0.1",
  "::1",
  "[::1]",
  "localhost",
  "host.docker.internal",
  // docker-compose service hostname inside the lewis compose network.
  "postgres",
]);

export type LocalSafetyOptions = {
  /** Connection string to the database the script intends to mutate. */
  connectionString: string;
  /** Override the script name in the error message — defaults to "this script". */
  scriptName?: string;
  /** Override NODE_ENV resolution — defaults to process.env.NODE_ENV. */
  nodeEnv?: string;
};

export class LocalSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalSafetyError";
  }
}

/**
 * Refuse to run when NODE_ENV is not in the development/test allowlist OR the
 * resolved host is not a recognized local literal/suffix. Throws
 * LocalSafetyError on rejection; callers translate to a process.exit(1).
 */
export function assertLocalDatabaseSafe(options: LocalSafetyOptions): void {
  const scriptName = options.scriptName ?? "this script";
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV ?? "development";

  if (!ALLOWED_NODE_ENVS.has(nodeEnv)) {
    throw new LocalSafetyError(
      `${scriptName} refuses to run with NODE_ENV=${nodeEnv}. ` +
        `Only ${[...ALLOWED_NODE_ENVS].join(", ")} are allowed.`,
    );
  }

  let host: string;
  try {
    // URL.hostname strips IPv6 brackets, so `[::1]` parses to host `::1`.
    host = new URL(options.connectionString).hostname;
  } catch {
    throw new LocalSafetyError(
      `${scriptName} could not parse the database connection string host. ` +
        `Refusing to run rather than risk acting on the wrong cluster.`,
    );
  }

  const isLocalLiteral = ALLOWED_HOST_LITERALS.has(host);
  const isLocalSuffix = host.endsWith(".local") || host.endsWith(".localhost");
  if (!isLocalLiteral && !isLocalSuffix) {
    throw new LocalSafetyError(
      `${scriptName} refuses to run against host '${host}'. ` +
        `Allowed: ${[...ALLOWED_HOST_LITERALS].join(", ")}, *.local, *.localhost. ` +
        `Use managed credential rotation tools for any non-local cluster.`,
    );
  }
}
