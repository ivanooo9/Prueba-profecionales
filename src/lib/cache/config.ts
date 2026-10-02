export const CACHE_TTL_SECONDS = 600;
export const CACHE_CONNECT_TIMEOUT_MS = 300;
export const CACHE_COMMAND_TIMEOUT_MS = 200;

export interface RedisConfig {
  url: string;
}

export function getRedisConfig(): RedisConfig | null {
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    return null;
  }

  return { url };
}

export function isCacheEnabled(): boolean {
  return getRedisConfig() !== null;
}
