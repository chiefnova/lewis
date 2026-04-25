import { z } from "zod";

export const nodeEnvSchema = z
  .enum(["development", "test", "staging", "production"])
  .default("development");

export function requiredEnv(name: string, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(
  name: string,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return env[name] || undefined;
}
