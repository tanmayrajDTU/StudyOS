import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import type { ScheduleEntry, TestSeries, TestKind } from '@/types/tests'

/** Weeks start on Monday. */
export const WEEK_OPTS = { weekStartsOn: 1 } as const

export const fmt = (d: Date): string => format(d, 'yyyy-MM-dd')

export function weekDays(anchor: string): string[] {
  const start = startOfWeek(parseISO(anchor), WEEK_OPTS)
  return Array.from({ length: 7 }, (_, i) => fmt(addDays(start, i)))
}

/** Rough minutes needed per item (no duration data exists on the item itself). */
const SERIES_MIN: Record<TestSeries, number> = {
  topic: 45,
  subject: 90,
  rapid: 30,
  mixed: 120,
  mock: 180,
  aptitude: 45,
  weekly: 120,
  monthly: 150,
  other: 60,
}

export function estimateMinutes(item: { kind: TestKind; series: TestSeries }): number {
  if (item.kind === 'quiz') return item.series === 'rapid' ? 20 : 30
  return SERIES_MIN[item.series]
}

export function formatMinutes(min: number): string {
  if (min <= 0) return '0m'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export interface DayCounts {
  total: number
  done: number
  skipped: number
  planned: number
}

export function countEntries(rows: ScheduleEntry[]): DayCounts {
  let done = 0
  let skipped = 0
  for (const r of rows) {
    if (r.status === 'done') done++
    else if (r.status === 'skipped') skipped++
  }
  return { total: rows.length, done, skipped, planned: rows.length - done - skipped }
}

export function groupByDate(rows: ScheduleEntry[]): Map<string, ScheduleEntry[]> {
  const map = new Map<string, ScheduleEntry[]>()
  for (const r of rows) {
    const list = map.get(r.planned_date)
    if (list) list.push(r)
    else map.set(r.planned_date, [r])
  }
  for (const list of map.values()) list.sort((a, b) => a.display_order - b.display_order)
  return map
}

export function dayLabel(date: string, today: string): string {
  const d = parseISO(date)
  if (date === today) return 'Today'
  if (date === fmt(addDays(parseISO(today), 1))) return 'Tomorrow'
  if (date === fmt(addDays(parseISO(today), -1))) return 'Yesterday'
  return format(d, 'EEE, d MMM')
}
