const lastCallByKey = new Map<string, number>();

export async function withRateLimit<T>(key: string, minIntervalMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const last = lastCallByKey.get(key) ?? 0;
  const waitMs = last + minIntervalMs - now;

  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  lastCallByKey.set(key, Date.now());
  return fn();
}
