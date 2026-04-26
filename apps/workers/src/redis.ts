import { resolveRedisConnectionConfig } from "@lewis/shared";
import Redis, { type RedisOptions } from "ioredis";

const redisConnections = new Set<Redis>();

export function createRedisConnection(connectionName: string): Redis {
  const config = resolveRedisConnectionConfig();
  const options: RedisOptions = {
    connectionName,
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
  };

  const client =
    config.kind === "url"
      ? new Redis(config.url, options)
      : new Redis({
          ...options,
          host: config.host,
          port: config.port,
        });

  redisConnections.add(client);
  client.once("end", () => {
    redisConnections.delete(client);
  });

  return client;
}

export async function closeRedisConnections(): Promise<void> {
  for (const connection of redisConnections) {
    connection.disconnect();
  }

  redisConnections.clear();
}
