// Assumes `entries` is already sorted latest-first (as all four granular
// asset logs are, straight from their Notion queries) — the first time a
// key is seen is therefore its latest logged value.
export function dedupeLatest<T>(entries: T[], keyOf: (entry: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const entry of entries) {
    const key = keyOf(entry);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(entry);
    }
  }
  return result;
}
