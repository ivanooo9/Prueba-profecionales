# Redis cache smoke checklist

1. Start the app with `REDIS_URL` unset.
    - Expect boot success.
    - Expect cache to fail open.
    - Expect cache-aware paths to call the fetcher directly with no Redis access.

2. Start the app with `REDIS_URL=redis://localhost:6379`.
   - Expect boot success.
   - Expect Redis-backed reads/writes to work.

3. Hit a cached endpoint twice.
   - First request should be a miss.
   - Second request should log `cache hit`.

4. Stop Redis (`docker stop redis` or kill the process).
   - Expect the endpoint to still return `200`.
   - Expect a `cache redis error` / Redis warning in logs.

5. Restart Redis.
   - Expect cache reads/writes to work again.
