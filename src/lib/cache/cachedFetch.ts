import { CACHE_COMMAND_TIMEOUT_MS, CACHE_TTL_SECONDS } from "./config";
import { getRedis } from "./client";
import { deserialize, serialize } from "./json";

async function safeRedisGet(redis: NonNullable<Awaited<ReturnType<typeof getRedis>>>, key: string): Promise<string | null> {
  let timedOut = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeout = new Promise<null>((resolve) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      resolve(null);
    }, CACHE_COMMAND_TIMEOUT_MS);
  });

  try {
    const value = await Promise.race([
      redis.get(key).catch((error: unknown) => {
        console.warn(`[cache] Redis GET failed for ${key}`, error);
        return null;
      }),
      timeout,
    ]);

    if (timedOut) {
      console.warn(`[cache] Redis GET timed out for ${key} after ${CACHE_COMMAND_TIMEOUT_MS}ms`);
    }

    return value;
  } finally {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL_SECONDS
): Promise<T> {
  const redis = await getRedis();
  if (!redis) {
    return fetcher();
  }

  const rawValue = await safeRedisGet(redis, key);

  if (rawValue !== null) {
    try {
      return deserialize<T>(rawValue);
    } catch (error) {
      console.warn(`[cache] cache payload invalid for ${key}`, error);
    }
  }

  const value = await fetcher();

  try {
    const serialized = serialize(value);
    void redis.set(key, serialized, { EX: ttlSeconds }).catch((error: unknown) => {
      console.warn(`[cache] Redis SET failed for ${key}`, error);
    });
  } catch (error) {
    console.warn(`[cache] cache serialization failed for ${key}`, error);
  }

  return value;
}

export async function invalidateCache(key: string): Promise<void> {
  try {
    const redis = await getRedis();
    if (redis) {
      await redis.del(key).catch(() => {});
    }
  } catch (_) {
    // Ignore redis errors
  }
}
