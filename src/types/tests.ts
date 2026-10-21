import { z } from 'zod'

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const TEST_KINDS = ['test', 'quiz'] as const
export const TEST_SERIES = [
  'topic',
  'subject',
  'rapid',
  'mixed',
  'mock',
  'aptitude',
  'weekly',
  'monthly',
  'other',
] as const
export const TEST_TIERS = ['free', 'premium'] as const
export const SCHEDULE_STATUSES = ['planned', 'done', 'skipped'] as const

export type TestKind = (typeof TEST_KINDS)[number]
export type TestSeries = (typeof TEST_SERIES)[number]
export type TestTier = (typeof TEST_TIERS)[number]
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number]

/* ------------------------------------------------------------------ */
/* DB row types (snake_case, mirrors supabase/tests-quizzes.sql)       */
/* ------------------------------------------------------------------ */

export interface TestItem {
  id: string
  user_id: string
  kind: TestKind
  category: string
  series: TestSeries
  title: string
  topics: string | null
  tier: TestTier | null
  is_available: boolean
  url: string | null
  notes: string | null
  display_order: number
  attempt_count: number
  last_attempted_at: string | null
  created_at: string
  updated_at: string
}

export interface TestAttempt {
  id: string
  item_id: string
  user_id: string
  attempted_at: string
  score: number | null
  max_score: number | null
  duration_min: number | null
  notes: string | null
  created_at: string
}

export interface TestScheduleRow {
  id: string
  user_id: string
  item_id: string
  /** Plain local date, 'yyyy-MM-dd'. Never convert through UTC. */
  planned_date: string
  display_order: number
  status: ScheduleStatus
  /** Optional 'HH:mm' */
  time_slot: string | null
  attempt_id: string | null
  created_at: string
  updated_at: string
}

/* ------------------------------------------------------------------ */
/* Derived / joined view types (used by the data layer and UI)         */
/* ------------------------------------------------------------------ */

export interface TestItemWithStats extends TestItem {
  last_score: number | null
  last_max_score: number | null
  best_score: number | null
  next_scheduled_date: string | null
}

export interface ScheduleEntry extends TestScheduleRow {
  item: Pick<
    TestItem,
    'id' | 'kind' | 'category' | 'series' | 'title' | 'topics' | 'tier' | 'is_available' | 'attempt_count' | 'url'
  >
}

export interface LibraryStats {
  total: number
  attempted: number
  unattempted: number
  totalAttempts: number
  byCategory: { category: string; kind: TestKind; total: number; attempted: number }[]
}

/* ------------------------------------------------------------------ */
/* Seed shape (no id / user_id / stats)                                */
/* ------------------------------------------------------------------ */

export type SeedTestItem = Pick<
  TestItem,
  'kind' | 'category' | 'series' | 'title' | 'topics' | 'tier' | 'is_available' | 'notes' | 'display_order'
> & { url?: string | null }

/* ------------------------------------------------------------------ */
/* Zod schemas                                                         */
/* ------------------------------------------------------------------ */

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected yyyy-MM-dd')
const timeSlot = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm')
const optionalText = z.string().trim().max(2000).nullish()

export const testKindSchema = z.enum(TEST_KINDS)
export const testSeriesSchema = z.enum(TEST_SERIES)
export const testTierSchema = z.enum(TEST_TIERS)
export const scheduleStatusSchema = z.enum(SCHEDULE_STATUSES)

export const createTestItemSchema = z.object({
  kind: testKindSchema,
  category: z.string().trim().min(1, 'Category is required').max(120),
  series: testSeriesSchema.default('other'),
  title: z.string().trim().min(1, 'Title is required').max(300),
  topics: optionalText,
  tier: testTierSchema.nullish(),
  is_available: z.boolean().default(true),
  url: z.union([z.literal(''), z.url()]).nullish(),
  notes: optionalText,
})

export const updateTestItemSchema = createTestItemSchema.partial().extend({
  id: z.uuid(),
})

export const reorderTestItemsSchema = z.object({
  ids: z.array(z.uuid()).min(1),
})

export const logAttemptSchema = z
  .object({
    itemId: z.uuid(),
    attemptedAt: z.string().datetime({ offset: true }).optional(),
    score: z.number().finite().nullish(),
    maxScore: z.number().finite().positive().nullish(),
    durationMin: z.number().int().min(0).max(1000).nullish(),
    notes: optionalText,
  })
  .refine((v) => v.score == null || v.maxScore == null || v.score <= v.maxScore, {
    message: 'Score cannot exceed max score',
    path: ['score'],
  })

export const scheduleItemSchema = z.object({
  itemId: z.uuid(),
  date: dateString,
  timeSlot: timeSlot.nullish(),
})

export const moveScheduleItemSchema = z.object({
  id: z.uuid(),
  newDate: dateString,
})

export const setScheduleStatusSchema = z.object({
  id: z.uuid(),
  status: scheduleStatusSchema,
})

export const scheduleRangeSchema = z.object({
  from: dateString,
  to: dateString,
})

export type CreateTestItemInput = z.input<typeof createTestItemSchema>
export type UpdateTestItemInput = z.input<typeof updateTestItemSchema>
export type LogAttemptInput = z.input<typeof logAttemptSchema>
export type ScheduleItemInput = z.input<typeof scheduleItemSchema>
export type MoveScheduleItemInput = z.input<typeof moveScheduleItemSchema>
export type SetScheduleStatusInput = z.input<typeof setScheduleStatusSchema>
