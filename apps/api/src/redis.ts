import { resolveRedisConnectionConfig } from "@corridor/shared";
import Redis, { type RedisOptions } from "ioredis";

import type { ReadinessCheck } from "@corridor/db";

let redisClient: Redis | undefined;

export function createRedisClient(env: NodeJS.ProcessEnv = process.env): Redis {
  const config = resolveRedisConnectionConfig(env);
  const options: RedisOptions = {
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
  };

  if (config.kind === "url") {
    return new Redis(config.url, options);
  }

  return new Redis({
    ...options,
    host: config.host,
    port: config.port,
  });
}

export function getRedisClient(): Redis {
  redisClient ??= createRedisClient();
  return redisClient;
}

export async function initializeRedis(): Promise<void> {
  const response = await getRedisClient().ping();
  if (response !== "PONG") {
    throw new Error("Redis ping failed during API startup");
  }
}

export async function checkRedisReady(): Promise<ReadinessCheck> {
  try {
    const response = await getRedisClient().ping();
    return response === "PONG"
      ? { ok: true }
      : { ok: false, message: "Redis ping did not return PONG" };
  } catch (error) {
    return { ok: false, message: safeErrorMessage(error) };
  }
}

export async function closeRedisClient(): Promise<void> {
  if (!redisClient) {
    return;
  }

  redisClient.disconnect();
  redisClient = undefined;
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown Redis readiness error";
}
