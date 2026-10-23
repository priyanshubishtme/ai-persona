export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export type RateLimiter = { check(key: string): RateLimitDecision };

/**
 * Fixed-window counter kept in this process's memory. On serverless hosts every instance has
 * its own counters and they reset on cold start, so this is best-effort abuse protection only.
 */
export function createRateLimiter(options: { limit: number; windowMs: number; now?: () => number }): RateLimiter {
  const now = options.now ?? Date.now;
  const windows = new Map<string, { start: number; count: number }>();

  return {
    check(key) {
      const t = now();
      if (windows.size > 5000) {
        for (const [k, w] of windows) if (t - w.start >= options.windowMs) windows.delete(k);
      }
      const current = windows.get(key);
      if (!current || t - current.start >= options.windowMs) {
        windows.set(key, { start: t, count: 1 });
        return { allowed: true };
      }
      if (current.count >= options.limit) {
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.start + options.windowMs - t) / 1000)) };
      }
      current.count++;
      return { allowed: true };
    },
  };
}
