/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Keyed buckets (e.g. client IP) keep timestamps of failed/recent events
 * inside a fixed window. This is per-process memory: on serverless it does
 * not persist across cold starts, but it still blunts bursts from a single
 * client within one instance's lifetime. Good-enough first line for an MVP;
 * swap for Upstash Redis if abuse becomes a concern.
 */
export class RateLimiter {
  private events = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number,
    private readonly maxEvents: number
  ) {}

  /** Number of recorded events for `key` inside the window (prunes expired). */
  count(key: string, now: number = Date.now()): number {
    const list = this.events.get(key);
    if (!list) return 0;
    const recent = list.filter((t) => now - t < this.windowMs);
    if (recent.length === 0) this.events.delete(key);
    else this.events.set(key, recent);
    return recent.length;
  }

  /** True when `key` has reached the event cap for the current window. */
  exceeded(key: string, now: number = Date.now()): boolean {
    return this.count(key, now) >= this.maxEvents;
  }

  /** Record an event for `key`. */
  hit(key: string, now: number = Date.now()): void {
    const list = this.events.get(key) ?? [];
    list.push(now);
    this.events.set(key, list);
  }

  /** Clear all events for `key` (e.g. after a successful login). */
  clear(key: string): void {
    this.events.delete(key);
  }
}

/** Best-effort client IP extraction behind Vercel/proxies. */
export function clientIp(headerGet: (name: string) => string | null): string {
  return (
    headerGet("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerGet("x-real-ip") ||
    "unknown"
  );
}
