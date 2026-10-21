'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { SupabaseClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import type { ZodType } from 'zod'
import { SEED_TESTS } from '@/lib/tests-data/tests'
import { SEED_QUIZZES } from '@/lib/tests-data/quizzes'
import { computeLibraryStats } from '@/lib/tests-stats'
import {
  createTestItemSchema,
  updateTestItemSchema,
  reorderTestItemsSchema,
  logAttemptSchema,
  scheduleItemSchema,
  moveScheduleItemSchema,
  setScheduleStatusSchema,
  scheduleRangeSchema,
  type CreateTestItemInput,
  type UpdateTestItemInput,
  type LogAttemptInput,
  type ScheduleItemInput,
  type MoveScheduleItemInput,
  type SetScheduleStatusInput,
  type ScheduleEntry,
  type ScheduleStatus,
  type TestAttempt,
  type TestItem,
  type TestItemWithStats,
  type TestScheduleRow,
  type LibraryStats,
} from '@/types/tests'

// Same auth gate as the other action files (src/actions/roadmap.ts).
async function getAuthUser(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.email !== 'tanmayraj1705@gmail.com') throw new Error('Unauthorized account')
  return user
}

const BATCH_SIZE = 100

/**
 * Inserts the built-in tests + quizzes library for the current user.
 * Idempotent: rows that already exist (same kind + category + title) are skipped, never overwritten,
 * so edited titles/notes, attempts and schedule entries are never touched.
 * Not called automatically; triggered from the Tests & Quizzes page.
 * @returns inserted = newly created rows, skipped = rows that already existed
 */
export async function seedTestsLibrary(): Promise<{ inserted: number; skipped: number }> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  const rows = [...SEED_TESTS, ...SEED_QUIZZES].map((item) => ({
    user_id: user.id,
    kind: item.kind,
    category: item.category,
    series: item.series,
    title: item.title,
    topics: item.topics ?? null,
    tier: item.tier ?? null,
    is_available: item.is_available,
    url: item.url || null,
    notes: item.notes ?? null,
    display_order: item.display_order,
  }))

  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { data, error } = await supabase
      .from('test_items')
      .upsert(batch, { onConflict: 'user_id,kind,category,title', ignoreDuplicates: true })
      .select('id')
    if (error) throw new Error(`Seeding failed: ${error.message}`)
    inserted += data?.length ?? 0
  }

  revalidatePath('/tests')
  revalidatePath('/tests/plan')
  return { inserted, skipped: rows.length - inserted }
}

/* ------------------------------------------------------------------ */
/* Internal helpers (not exported: 'use server' files export actions only) */
/* ------------------------------------------------------------------ */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function parse<T>(schema: ZodType<T>, input: unknown): T {
  const res = schema.safeParse(input)
  if (!res.success) {
    const issue = res.error.issues[0]
    throw new Error(issue ? `${issue.path.join('.') || 'input'}: ${issue.message}` : 'Invalid input')
  }
  return res.data
}

function assertDate(value: string) {
  if (!DATE_RE.test(value)) throw new Error('Expected date as yyyy-MM-dd')
}

function friendly(error: { code?: string; message: string }, duplicateMessage: string): Error {
  return new Error(error.code === '23505' ? duplicateMessage : error.message)
}

function revalidateAll() {
  revalidatePath('/tests')
  revalidatePath('/tests/plan')
}

async function nextItemOrder(supabase: SupabaseClient, userId: string, kind: string, category: string) {
  const { data } = await supabase
    .from('test_items')
    .select('display_order')
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('category', category)
    .order('display_order', { ascending: false })
    .limit(1)
  return ((data?.[0]?.display_order as number | undefined) ?? -1) + 1
}

async function nextScheduleOrder(supabase: SupabaseClient, userId: string, date: string) {
  const { data } = await supabase
    .from('test_schedule')
    .select('display_order')
    .eq('user_id', userId)
    .eq('planned_date', date)
    .order('display_order', { ascending: false })
    .limit(1)
  return ((data?.[0]?.display_order as number | undefined) ?? -1) + 1
}

const SCHEDULE_SELECT =
  '*, item:test_items(id, kind, category, series, title, topics, tier, is_available, attempt_count, url)'

/* ------------------------------------------------------------------ */
/* Library: read                                                       */
/* ------------------------------------------------------------------ */

/**
 * All tests and quizzes for the user with derived stats.
 * @param today optional local date 'yyyy-MM-dd' (pass the client's date; the server may be in UTC)
 * @returns items ordered by category then display_order, each with last/best score and next planned date
 */
export async function getTestItems(today?: string): Promise<TestItemWithStats[]> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  const todayStr = today ?? format(new Date(), 'yyyy-MM-dd')
  assertDate(todayStr)

  const [itemsRes, attemptsRes, scheduleRes] = await Promise.all([
    supabase
      .from('test_items')
      .select('*')
      .eq('user_id', user.id)
      .order('category', { ascending: true })
      .order('display_order', { ascending: true }),
    supabase
      .from('test_attempts')
      .select('item_id, attempted_at, score, max_score')
      .eq('user_id', user.id)
      .order('attempted_at', { ascending: false }),
    supabase
      .from('test_schedule')
      .select('item_id, planned_date')
      .eq('user_id', user.id)
      .eq('status', 'planned')
      .gte('planned_date', todayStr)
      .order('planned_date', { ascending: true }),
  ])
  if (itemsRes.error) throw new Error(itemsRes.error.message)
  if (attemptsRes.error) throw new Error(attemptsRes.error.message)
  if (scheduleRes.error) throw new Error(scheduleRes.error.message)

  type Agg = { last_score: number | null; last_max: number | null; best: number | null }
  const aggs = new Map<string, Agg>()
  for (const a of attemptsRes.data ?? []) {
    // rows arrive newest-first, so the first row per item is the latest attempt
    const cur = aggs.get(a.item_id)
    const score = a.score as number | null
    if (!cur) {
      aggs.set(a.item_id, { last_score: score, last_max: a.max_score as number | null, best: score })
    } else if (score != null && (cur.best == null || score > cur.best)) {
      cur.best = score
    }
  }

  const nextDate = new Map<string, string>()
  for (const s of scheduleRes.data ?? []) {
    if (!nextDate.has(s.item_id)) nextDate.set(s.item_id, s.planned_date as string)
  }

  return (itemsRes.data as TestItem[]).map((it) => {
    const agg = aggs.get(it.id)
    return {
      ...it,
      last_score: agg?.last_score ?? null,
      last_max_score: agg?.last_max ?? null,
      best_score: agg?.best ?? null,
      next_scheduled_date: nextDate.get(it.id) ?? null,
    }
  })
}

/**
 * Library totals: attempted vs unattempted, total attempts, per-category progress.
 * @returns LibraryStats
 */
export async function getLibraryStats(): Promise<LibraryStats> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  const { data, error } = await supabase
    .from('test_items')
    .select('kind, category, attempt_count, is_available')
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
  return computeLibraryStats(data ?? [])
}

/* ------------------------------------------------------------------ */
/* Library: write                                                      */
/* ------------------------------------------------------------------ */

/**
 * Create a test or quiz. Appended to the end of its category.
 * @param input CreateTestItemInput (kind, category, title required)
 * @returns the created TestItem
 * @throws friendly error if the same kind + category + title already exists
 */
export async function createTestItem(input: CreateTestItemInput): Promise<TestItem> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  const v = parse(createTestItemSchema, input)

  const { data, error } = await supabase
    .from('test_items')
    .insert({
      user_id: user.id,
      kind: v.kind,
      category: v.category,
      series: v.series,
      title: v.title,
      topics: v.topics || null,
      tier: v.tier ?? null,
      is_available: v.is_available,
      url: v.url || null,
      notes: v.notes || null,
      display_order: await nextItemOrder(supabase, user.id, v.kind, v.category),
    })
    .select('*')
    .single()
  if (error) throw friendly(error, 'A test/quiz with this title already exists in that category')

  revalidateAll()
  return data as TestItem
}

/**
 * Update any subset of fields of a test/quiz (id required). attempt_count is never editable here.
 * @returns the updated TestItem
 */
export async function updateTestItem(input: UpdateTestItemInput): Promise<TestItem> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  const { id, ...rest } = parse(updateTestItemSchema, input)

  const patch: Record<string, unknown> = {}
  for (const [k, val] of Object.entries(rest)) {
    if (val === undefined) continue
    patch[k] = (k === 'topics' || k === 'url' || k === 'notes') && val === '' ? null : val
  }
  if (Object.keys(patch).length === 0) throw new Error('Nothing to update')

  const { data, error } = await supabase
    .from('test_items')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()
  if (error) throw friendly(error, 'A test/quiz with this title already exists in that category')

  revalidateAll()
  return data as TestItem
}

/**
 * Delete a test/quiz. Its attempts and schedule entries are removed by cascade.
 */
export async function deleteTestItem(id: string): Promise<{ id: string }> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  const { error } = await supabase.from('test_items').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidateAll()
  return { id }
}

/**
 * Persist a new manual order. display_order = index in `ids`. Pass the ids of ONE category/list in the desired order.
 */
export async function reorderTestItems(ids: string[]): Promise<{ count: number }> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  const v = parse(reorderTestItemsSchema, { ids })
  const results = await Promise.all(
    v.ids.map((id, index) =>
      supabase.from('test_items').update({ display_order: index }).eq('id', id).eq('user_id', user.id),
    ),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(failed.error.message)
  revalidatePath('/tests')
  return { count: v.ids.length }
}

/* ------------------------------------------------------------------ */
/* Attempts                                                            */
/* ------------------------------------------------------------------ */

/**
 * Record that a test/quiz was given. A bare `{ itemId }` is a valid quick "+1 attempt".
 * test_items.attempt_count / last_attempted_at are kept in sync by a DB trigger.
 * @returns the created TestAttempt
 */
export async function logAttempt(input: LogAttemptInput): Promise<TestAttempt> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  const v = parse(logAttemptSchema, input)

  const { data, error } = await supabase
    .from('test_attempts')
    .insert({
      item_id: v.itemId,
      user_id: user.id,
      ...(v.attemptedAt ? { attempted_at: v.attemptedAt } : {}),
      score: v.score ?? null,
      max_score: v.maxScore ?? null,
      duration_min: v.durationMin ?? null,
      notes: v.notes || null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)

  revalidateAll()
  return data as TestAttempt
}

/**
 * Delete one attempt (count is re-synced by trigger). If a schedule row was linked to it,
 * that link is cleared automatically (FK ON DELETE SET NULL).
 */
export async function deleteAttempt(id: string): Promise<{ id: string }> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  const { error } = await supabase.from('test_attempts').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidateAll()
  return { id }
}

/**
 * Attempt history for one item, newest first.
 */
export async function getAttempts(itemId: string): Promise<TestAttempt[]> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  const { data, error } = await supabase
    .from('test_attempts')
    .select('*')
    .eq('item_id', itemId)
    .eq('user_id', user.id)
    .order('attempted_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as TestAttempt[]
}

/* ------------------------------------------------------------------ */
/* Day plan (schedule)                                                 */
/* ------------------------------------------------------------------ */

/**
 * Schedule entries (with joined item info) for an inclusive date range, ordered by date then display_order.
 * @param from 'yyyy-MM-dd'
 * @param to 'yyyy-MM-dd'
 */
export async function getSchedule(from: string, to: string): Promise<ScheduleEntry[]> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  const v = parse(scheduleRangeSchema, { from, to })
  const { data, error } = await supabase
    .from('test_schedule')
    .select(SCHEDULE_SELECT)
    .eq('user_id', user.id)
    .gte('planned_date', v.from)
    .lte('planned_date', v.to)
    .order('planned_date', { ascending: true })
    .order('display_order', { ascending: true })
  if (error) throw new Error(error.message)
  return data as unknown as ScheduleEntry[]
}

/**
 * Planned-but-not-done entries dated before `today` (the "Overdue" list), oldest first.
 * @param today 'yyyy-MM-dd' local date from the client
 */
export async function getOverdueSchedule(today: string): Promise<ScheduleEntry[]> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  assertDate(today)
  const { data, error } = await supabase
    .from('test_schedule')
    .select(SCHEDULE_SELECT)
    .eq('user_id', user.id)
    .eq('status', 'planned')
    .lt('planned_date', today)
    .order('planned_date', { ascending: true })
    .order('display_order', { ascending: true })
  if (error) throw new Error(error.message)
  return data as unknown as ScheduleEntry[]
}

/**
 * Put an item on a day. Idempotent: if it is already scheduled that day, the existing row is returned.
 * @returns the schedule row (appended to the end of that day)
 */
export async function scheduleItem(input: ScheduleItemInput): Promise<TestScheduleRow> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  const v = parse(scheduleItemSchema, input)

  const existing = await supabase
    .from('test_schedule')
    .select('*')
    .eq('item_id', v.itemId)
    .eq('planned_date', v.date)
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing.error) throw new Error(existing.error.message)
  if (existing.data) return existing.data as TestScheduleRow

  const { data, error } = await supabase
    .from('test_schedule')
    .insert({
      user_id: user.id,
      item_id: v.itemId,
      planned_date: v.date,
      time_slot: v.timeSlot ?? null,
      display_order: await nextScheduleOrder(supabase, user.id, v.date),
    })
    .select('*')
    .single()
  if (error) throw friendly(error, 'Already scheduled on that day')

  revalidateAll()
  return data as TestScheduleRow
}

/**
 * Bulk version of scheduleItem for the multi-select picker. Items already on that day are skipped.
 * @returns how many rows were added
 */
export async function scheduleItems(itemIds: string[], date: string): Promise<{ added: number }> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  assertDate(date)
  const ids = [...new Set(itemIds)]
  if (ids.length === 0) return { added: 0 }

  const existing = await supabase
    .from('test_schedule')
    .select('item_id')
    .eq('user_id', user.id)
    .eq('planned_date', date)
    .in('item_id', ids)
  if (existing.error) throw new Error(existing.error.message)
  const already = new Set((existing.data ?? []).map((r) => r.item_id as string))
  const fresh = ids.filter((id) => !already.has(id))
  if (fresh.length === 0) return { added: 0 }

  const start = await nextScheduleOrder(supabase, user.id, date)
  const { error } = await supabase.from('test_schedule').insert(
    fresh.map((item_id, i) => ({
      user_id: user.id,
      item_id,
      planned_date: date,
      display_order: start + i,
    })),
  )
  if (error) throw new Error(error.message)

  revalidateAll()
  return { added: fresh.length }
}

/**
 * Remove an entry from the plan. An attempt that was created by marking it done is KEPT
 * (it really happened); delete it from the attempt history if you want it gone.
 */
export async function unscheduleItem(id: string): Promise<{ id: string }> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  const { error } = await supabase.from('test_schedule').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidateAll()
  return { id }
}

/**
 * Remove every entry of one day that is not done (done entries stay as history).
 * @returns number of removed rows
 */
export async function clearScheduleDay(date: string): Promise<{ removed: number }> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  assertDate(date)
  const { data, error } = await supabase
    .from('test_schedule')
    .delete()
    .eq('user_id', user.id)
    .eq('planned_date', date)
    .neq('status', 'done')
    .select('id')
  if (error) throw new Error(error.message)
  revalidateAll()
  return { removed: data?.length ?? 0 }
}

/**
 * Move an entry to another date (appended to the end of that day).
 * @throws friendly error if the same item is already planned on the target date
 */
export async function moveScheduleItem(input: MoveScheduleItemInput): Promise<TestScheduleRow> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  const v = parse(moveScheduleItemSchema, input)

  const { data, error } = await supabase
    .from('test_schedule')
    .update({
      planned_date: v.newDate,
      display_order: await nextScheduleOrder(supabase, user.id, v.newDate),
    })
    .eq('id', v.id)
    .eq('user_id', user.id)
    .select('*')
    .single()
  if (error) throw friendly(error, 'This test is already planned on that day')

  revalidateAll()
  return data as TestScheduleRow
}

/**
 * Persist the order of one day. display_order = index in `ids`.
 */
export async function reorderSchedule(date: string, ids: string[]): Promise<{ count: number }> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  assertDate(date)
  const v = parse(reorderTestItemsSchema, { ids })
  const results = await Promise.all(
    v.ids.map((id, index) =>
      supabase
        .from('test_schedule')
        .update({ display_order: index })
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('planned_date', date),
    ),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(failed.error.message)
  revalidatePath('/tests/plan')
  return { count: v.ids.length }
}

/**
 * Set or clear the optional 'HH:mm' time slot of an entry.
 */
export async function updateScheduleTimeSlot(id: string, timeSlot: string | null): Promise<TestScheduleRow> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  if (timeSlot != null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeSlot)) throw new Error('Expected time as HH:mm')
  const { data, error } = await supabase
    .from('test_schedule')
    .update({ time_slot: timeSlot })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/tests/plan')
  return data as TestScheduleRow
}

/**
 * Change an entry's status.
 *  - planned/skipped -> done: creates an attempt (now) and links it via attempt_id, so counts stay correct.
 *  - done -> planned/skipped: deletes ONLY the attempt this entry created (manual attempts are untouched).
 *  - any other change just updates the status.
 * supabase-js has no multi-statement transaction, so the steps are ordered and compensated on failure.
 * @returns the updated schedule row
 */
export async function setScheduleStatus(input: SetScheduleStatusInput): Promise<TestScheduleRow> {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)
  const v = parse(setScheduleStatusSchema, input)
  const next: ScheduleStatus = v.status

  const { data: row, error: rowErr } = await supabase
    .from('test_schedule')
    .select('*')
    .eq('id', v.id)
    .eq('user_id', user.id)
    .single()
  if (rowErr || !row) throw new Error(rowErr?.message ?? 'Schedule entry not found')
  const current = row as TestScheduleRow
  if (current.status === next) return current

  let attemptId: string | null = current.attempt_id
  let createdAttemptId: string | null = null

  if (next === 'done') {
    const { data: attempt, error } = await supabase
      .from('test_attempts')
      .insert({ item_id: current.item_id, user_id: user.id })
      .select('id')
      .single()
    if (error || !attempt) throw new Error(error?.message ?? 'Could not log attempt')
    attemptId = attempt.id as string
    createdAttemptId = attemptId
  }

  const { data: updated, error: updErr } = await supabase
    .from('test_schedule')
    .update({ status: next, attempt_id: next === 'done' ? attemptId : null })
    .eq('id', v.id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (updErr || !updated) {
    if (createdAttemptId) await supabase.from('test_attempts').delete().eq('id', createdAttemptId)
    throw new Error(updErr?.message ?? 'Could not update status')
  }

  if (current.status === 'done' && next !== 'done' && current.attempt_id) {
    const { error } = await supabase.from('test_attempts').delete().eq('id', current.attempt_id).eq('user_id', user.id)
    if (error) throw new Error(error.message)
  }

  revalidateAll()
  return updated as TestScheduleRow
}
