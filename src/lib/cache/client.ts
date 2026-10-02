import { createClient } from "redis";
import { CACHE_CONNECT_TIMEOUT_MS, getRedisConfig, isCacheEnabled } from "./config";

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let connectPromise: Promise<RedisClient | null> | null = null;

function getOrCreateClient(): RedisClient | null {
  const redisConfig = getRedisConfig();
  if (!redisConfig) {
    return null;
  }

  if (!client) {
    client = createClient({
      url: redisConfig.url,
      socket: {
        reconnectStrategy: false
      }
    });
    client.on("error", (error: any) => {
      if (error?.code === "ENOTFOUND" || error?.message?.includes("ENOTFOUND")) {
        return;
      }
      console.warn("[cache] Redis client error", error?.message || error);
    });
  }

  return client;
}

export async function getRedis(): Promise<RedisClient | null> {
  if (!isCacheEnabled()) {
    return null;
  }

  const redis = getOrCreateClient();
  if (!redis) {
    return null;
  }

  if (redis.isReady) {
    return redis;
  }

  if (!connectPromise) {
    connectPromise = redis
      .connect()
      .then(() => redis)
      .catch((error: unknown) => {
        console.warn("[cache] Redis connect failed", error);
        try {
          if (client) {
            void client.disconnect().catch(() => {});
          }
        } catch {
          // no-op
        }
        client = null;
        return null;
      })
      .finally(() => {
        connectPromise = null;
      });
  }

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;

  try {
    await Promise.race([
      connectPromise,
      new Promise<void>((resolve) => {
        timeoutHandle = setTimeout(() => {
          timedOut = true;
          resolve();
        }, CACHE_CONNECT_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
  }

  if (redis.isReady) {
    return redis;
  }

  if (timedOut) {
    console.warn(`[cache] Redis connect timed out after ${CACHE_CONNECT_TIMEOUT_MS}ms`);
    try {
      if (client) {
        void client.disconnect().catch(() => {});
      }
    } catch {
      // no-op
    }
    client = null;
  }

  return null;
}

export async function closeRedis(): Promise<void> {
  if (!client) {
    return;
  }

  const activeClient = client;
  client = null;
  connectPromise = null;

  try {
    if (activeClient.isOpen) {
      await activeClient.quit().catch(() => {});
    } else {
      void activeClient.disconnect().catch(() => {});
    }
  } catch (error) {
    console.warn("[cache] Redis close failed", error);
  }
}
