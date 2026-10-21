'use client'

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  getTestItems,
  getAttempts,
  getSchedule,
  getOverdueSchedule,
  createTestItem,
  updateTestItem,
  deleteTestItem,
  reorderTestItems,
  logAttempt,
  deleteAttempt,
  scheduleItem,
  scheduleItems,
  unscheduleItem,
  clearScheduleDay,
  moveScheduleItem,
  reorderSchedule,
  updateScheduleTimeSlot,
  setScheduleStatus,
  seedTestsLibrary,
} from '@/actions/tests'
import { computeLibraryStats } from '@/lib/tests-stats'
import type {
  CreateTestItemInput,
  LogAttemptInput,
  MoveScheduleItemInput,
  ScheduleEntry,
  ScheduleItemInput,
  SetScheduleStatusInput,
  TestItem,
  TestItemWithStats,
  UpdateTestItemInput,
} from '@/types/tests'

/* ------------------------------------------------------------------ */
/* Keys + helpers                                                      */
/* ------------------------------------------------------------------ */

export const testsKeys = {
  all: ['tests'] as const,
  items: ['tests', 'items'] as const,
  schedule: ['tests', 'schedule'] as const,
  scheduleRange: (from: string, to: string) => ['tests', 'schedule', from, to] as const,
  overdue: (today: string) => ['tests', 'overdue', today] as const,
  attempts: (itemId: string) => ['tests', 'attempts', itemId] as const,
}

/** Local calendar date 'yyyy-MM-dd' (never via UTC). */
export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

type Snapshot = [QueryKey, unknown][]

async function snapshot(qc: QueryClient): Promise<Snapshot> {
  await qc.cancelQueries({ queryKey: testsKeys.all })
  return qc.getQueriesData({ queryKey: testsKeys.all }) as Snapshot
}

function rollback(qc: QueryClient, snap?: Snapshot) {
  snap?.forEach(([key, data]) => qc.setQueryData(key, data))
}

function patchItems(qc: QueryClient, fn: (items: TestItemWithStats[]) => TestItemWithStats[]) {
  qc.setQueryData<TestItemWithStats[]>(testsKeys.items, (old) => (old ? fn(old) : old))
}

function patchSchedules(qc: QueryClient, fn: (rows: ScheduleEntry[]) => ScheduleEntry[]) {
  qc.setQueriesData<ScheduleEntry[]>({ queryKey: testsKeys.schedule }, (old) => (old ? fn(old) : old))
  qc.setQueriesData<ScheduleEntry[]>({ queryKey: ['tests', 'overdue'] }, (old) => (old ? fn(old) : old))
}

function findScheduleEntry(qc: QueryClient, id: string): ScheduleEntry | undefined {
  const lists = [
    ...qc.getQueriesData<ScheduleEntry[]>({ queryKey: testsKeys.schedule }),
    ...qc.getQueriesData<ScheduleEntry[]>({ queryKey: ['tests', 'overdue'] }),
  ]
  for (const [, rows] of lists) {
    const hit = rows?.find((r) => r.id === id)
    if (hit) return hit
  }
  return undefined
}

function bumpAttempts(qc: QueryClient, itemId: string, delta: number, stamp?: string) {
  patchItems(qc, (items) =>
    items.map((it) =>
      it.id === itemId
        ? {
            ...it,
            attempt_count: Math.max(0, it.attempt_count + delta),
            last_attempted_at: delta > 0 ? (stamp ?? new Date().toISOString()) : it.last_attempted_at,
          }
        : it,
    ),
  )
  // keep the embedded count in schedule rows in step too
  patchSchedules(qc, (rows) =>
    rows.map((r) =>
      r.item_id === itemId ? { ...r, item: { ...r.item, attempt_count: Math.max(0, r.item.attempt_count + delta) } } : r,
    ),
  )
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

/** Whole library with stats. Pass nothing to use the client's local today for "next scheduled". */
export function useTestItems() {
  return useQuery({
    queryKey: testsKeys.items,
    queryFn: () => getTestItems(todayStr()),
    staleTime: 30_000,
  })
}

/** Library totals, derived from the items cache so optimistic updates show instantly. */
export function useLibraryStats() {
  return useQuery({
    queryKey: testsKeys.items,
    queryFn: () => getTestItems(todayStr()),
    staleTime: 30_000,
    select: computeLibraryStats,
  })
}

/** Schedule entries for an inclusive date range ('yyyy-MM-dd'). */
export function useSchedule(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: testsKeys.scheduleRange(from, to),
    queryFn: () => getSchedule(from, to),
    staleTime: 15_000,
    enabled,
  })
}

/** Planned-but-not-done entries before today. */
export function useOverdue(today: string = todayStr()) {
  return useQuery({
    queryKey: testsKeys.overdue(today),
    queryFn: () => getOverdueSchedule(today),
    staleTime: 15_000,
  })
}

/** Attempt history for one item (enable only when a drawer is open). */
export function useAttempts(itemId: string | null, enabled = true) {
  return useQuery({
    queryKey: testsKeys.attempts(itemId ?? 'none'),
    queryFn: () => getAttempts(itemId as string),
    enabled: enabled && !!itemId,
  })
}

/* ------------------------------------------------------------------ */
/* Library mutations                                                   */
/* ------------------------------------------------------------------ */

export function useSeedLibrary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => seedTestsLibrary(),
    onSettled: () => qc.invalidateQueries({ queryKey: testsKeys.all }),
  })
}

export function useCreateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTestItemInput) => createTestItem(input),
    onSuccess: (created: TestItem) => {
      patchItems(qc, (items) => [
        ...items,
        { ...created, last_score: null, last_max_score: null, best_score: null, next_scheduled_date: null },
      ])
    },
    onSettled: () => qc.invalidateQueries({ queryKey: testsKeys.items }),
  })
}

export function useUpdateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateTestItemInput) => updateTestItem(input),
    onMutate: async (input) => {
      const snap = await snapshot(qc)
      const { id, ...rest } = input
      const clean = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined))
      patchItems(qc, (items) => items.map((it) => (it.id === id ? ({ ...it, ...clean } as TestItemWithStats) : it)))
      return { snap }
    },
    onError: (_e, _v, ctx) => rollback(qc, ctx?.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: testsKeys.all }),
  })
}

export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTestItem(id),
    onMutate: async (id) => {
      const snap = await snapshot(qc)
      patchItems(qc, (items) => items.filter((it) => it.id !== id))
      patchSchedules(qc, (rows) => rows.filter((r) => r.item_id !== id))
      return { snap }
    },
    onError: (_e, _v, ctx) => rollback(qc, ctx?.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: testsKeys.all }),
  })
}

/** Pass the ids of one list (e.g. one category) in the new order. */
export function useReorderItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => reorderTestItems(ids),
    onMutate: async (ids) => {
      const snap = await snapshot(qc)
      const order = new Map(ids.map((id, i) => [id, i]))
      patchItems(qc, (items) =>
        items.map((it) => (order.has(it.id) ? { ...it, display_order: order.get(it.id) as number } : it)),
      )
      return { snap }
    },
    onError: (_e, _v, ctx) => rollback(qc, ctx?.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: testsKeys.items }),
  })
}

/* ------------------------------------------------------------------ */
/* Attempts                                                            */
/* ------------------------------------------------------------------ */

/** Quick "+1 attempt" is `mutate({ itemId })`; optional score/duration/notes allowed. */
export function useLogAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: LogAttemptInput) => logAttempt(input),
    onMutate: async (input) => {
      const snap = await snapshot(qc)
      bumpAttempts(qc, input.itemId, 1, input.attemptedAt)
      if (input.score != null) {
        patchItems(qc, (items) =>
          items.map((it) =>
            it.id === input.itemId
              ? {
                  ...it,
                  last_score: input.score ?? null,
                  last_max_score: input.maxScore ?? null,
                  best_score: Math.max(it.best_score ?? input.score ?? 0, input.score ?? 0),
                }
              : it,
          ),
        )
      }
      return { snap }
    },
    onError: (_e, _v, ctx) => rollback(qc, ctx?.snap),
    onSettled: (_d, _e, input) => {
      qc.invalidateQueries({ queryKey: testsKeys.items })
      qc.invalidateQueries({ queryKey: testsKeys.attempts(input.itemId) })
    },
  })
}

/** Decrements the cached count optimistically; scores re-sync on settle. */
export function useDeleteAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; itemId: string }) => deleteAttempt(id),
    onMutate: async ({ id, itemId }) => {
      const snap = await snapshot(qc)
      bumpAttempts(qc, itemId, -1)
      qc.setQueryData<{ id: string }[]>(testsKeys.attempts(itemId), (old) => old?.filter((a) => a.id !== id))
      return { snap }
    },
    onError: (_e, _v, ctx) => rollback(qc, ctx?.snap),
    onSettled: (_d, _e, { itemId }) => {
      qc.invalidateQueries({ queryKey: testsKeys.all })
      qc.invalidateQueries({ queryKey: testsKeys.attempts(itemId) })
    },
  })
}

/* ------------------------------------------------------------------ */
/* Schedule mutations                                                  */
/* ------------------------------------------------------------------ */

export function useScheduleItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ScheduleItemInput) => scheduleItem(input),
    onSettled: () => qc.invalidateQueries({ queryKey: testsKeys.all }),
  })
}

/** Multi-select picker: schedule many items on one day. */
export function useScheduleItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemIds, date }: { itemIds: string[]; date: string }) => scheduleItems(itemIds, date),
    onSettled: () => qc.invalidateQueries({ queryKey: testsKeys.all }),
  })
}

export function useUnscheduleItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => unscheduleItem(id),
    onMutate: async (id) => {
      const snap = await snapshot(qc)
      patchSchedules(qc, (rows) => rows.filter((r) => r.id !== id))
      return { snap }
    },
    onError: (_e, _v, ctx) => rollback(qc, ctx?.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: testsKeys.all }),
  })
}

export function useClearScheduleDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (date: string) => clearScheduleDay(date),
    onMutate: async (date) => {
      const snap = await snapshot(qc)
      patchSchedules(qc, (rows) => rows.filter((r) => !(r.planned_date === date && r.status !== 'done')))
      return { snap }
    },
    onError: (_e, _v, ctx) => rollback(qc, ctx?.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: testsKeys.all }),
  })
}

export function useMoveScheduleItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: MoveScheduleItemInput) => moveScheduleItem(input),
    onMutate: async ({ id, newDate }) => {
      const snap = await snapshot(qc)
      patchSchedules(qc, (rows) => rows.map((r) => (r.id === id ? { ...r, planned_date: newDate } : r)))
      return { snap }
    },
    onError: (_e, _v, ctx) => rollback(qc, ctx?.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: testsKeys.all }),
  })
}

/** Persist drag-and-drop order for one day. Pass the entry ids in the new order. */
export function useReorderSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ date, ids }: { date: string; ids: string[] }) => reorderSchedule(date, ids),
    onMutate: async ({ date, ids }) => {
      const snap = await snapshot(qc)
      const order = new Map(ids.map((id, i) => [id, i]))
      patchSchedules(qc, (rows) =>
        rows
          .map((r) => (r.planned_date === date && order.has(r.id) ? { ...r, display_order: order.get(r.id) as number } : r))
          .sort((a, b) => a.planned_date.localeCompare(b.planned_date) || a.display_order - b.display_order),
      )
      return { snap }
    },
    onError: (_e, _v, ctx) => rollback(qc, ctx?.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: testsKeys.schedule }),
  })
}

export function useUpdateTimeSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, timeSlot }: { id: string; timeSlot: string | null }) => updateScheduleTimeSlot(id, timeSlot),
    onMutate: async ({ id, timeSlot }) => {
      const snap = await snapshot(qc)
      patchSchedules(qc, (rows) => rows.map((r) => (r.id === id ? { ...r, time_slot: timeSlot } : r)))
      return { snap }
    },
    onError: (_e, _v, ctx) => rollback(qc, ctx?.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: testsKeys.schedule }),
  })
}

/**
 * planned/skipped <-> done. Marking done also logs an attempt on the server; the cached
 * attempt count is bumped optimistically and rolled back on error.
 */
export function useSetScheduleStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SetScheduleStatusInput) => setScheduleStatus(input),
    onMutate: async ({ id, status }) => {
      const entry = findScheduleEntry(qc, id)
      const snap = await snapshot(qc)
      if (entry) {
        if (status === 'done' && entry.status !== 'done') bumpAttempts(qc, entry.item_id, 1)
        if (entry.status === 'done' && status !== 'done' && entry.attempt_id) bumpAttempts(qc, entry.item_id, -1)
        patchSchedules(qc, (rows) =>
          rows.map((r) => (r.id === id ? { ...r, status, attempt_id: status === 'done' ? r.attempt_id : null } : r)),
        )
      }
      return { snap }
    },
    onError: (_e, _v, ctx) => rollback(qc, ctx?.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: testsKeys.all }),
  })
}
