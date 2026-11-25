/** A small in-memory cache for read-heavy summaries (Insights). Each
 * server instance keeps its own; entries live `ttlMs` and the same key
 * asked twice at once shares one database round trip. */
const store = new Map<string, { at: number; value: Promise<unknown> }>()

export function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key)
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>
  const value = load().catch((error: unknown) => {
    store.delete(key)
    throw error
  })
  store.set(key, { at: Date.now(), value })
  if (store.size > 500) {
    const oldest = [...store.entries()]
      .sort((a, b) => a[1].at - b[1].at)
      .slice(0, 100)
    for (const [k] of oldest) store.delete(k)
  }
  return value
}
