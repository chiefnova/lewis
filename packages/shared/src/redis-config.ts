import { z } from "zod";

export type RedisConnectionConfig =
  | {
      kind: "url";
      url: string;
    }
  | {
      kind: "parameters";
      host: string;
      port: number;
    };

const redisEnvSchema = z.object({
  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().min(1).optional(),
  REDIS_PORT: z.coerce.number().int().positive().optional(),
});

export function resolveRedisConnectionConfig(
  env: NodeJS.ProcessEnv = process.env,
): RedisConnectionConfig {
  const parsed = redisEnvSchema.parse(env);

  if (parsed.REDIS_URL) {
    return {
      kind: "url",
      url: parsed.REDIS_URL,
    };
  }

  const host = parsed.REDIS_HOST;
  const port = parsed.REDIS_PORT;
  const missing = [
    ["REDIS_HOST", host],
    ["REDIS_PORT", port],
  ]
    .filter(([, value]) => value === undefined || value === "")
    .map(([name]) => name);

  if (missing.length > 0 || !host || port === undefined) {
    throw new Error(`Missing Redis configuration. Provide REDIS_URL or ${missing.join(", ")}.`);
  }

  return {
    kind: "parameters",
    host,
    port,
  };
}
