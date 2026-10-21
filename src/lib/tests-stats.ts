import type { LibraryStats, TestItem } from '@/types/tests'

/** Pure helper shared by the server action and the client hooks (so optimistic updates keep stats live). */
export function computeLibraryStats(
  items: Pick<TestItem, 'kind' | 'category' | 'attempt_count' | 'is_available'>[],
): LibraryStats {
  const byKey = new Map<string, { category: string; kind: TestItem['kind']; total: number; attempted: number }>()
  let attempted = 0
  let totalAttempts = 0

  for (const it of items) {
    const key = `${it.kind}|${it.category}`
    const row = byKey.get(key) ?? { category: it.category, kind: it.kind, total: 0, attempted: 0 }
    row.total += 1
    if (it.attempt_count > 0) {
      row.attempted += 1
      attempted += 1
    }
    totalAttempts += it.attempt_count
    byKey.set(key, row)
  }

  return {
    total: items.length,
    attempted,
    unattempted: items.length - attempted,
    totalAttempts,
    byCategory: [...byKey.values()].sort((a, b) => a.category.localeCompare(b.category) || a.kind.localeCompare(b.kind)),
  }
}
