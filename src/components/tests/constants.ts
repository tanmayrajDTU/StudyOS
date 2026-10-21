import type { TestKind, TestSeries, TestTier } from '@/types/tests'

export const SERIES_LABEL: Record<TestSeries, string> = {
  topic: 'Topic',
  subject: 'Subject',
  rapid: 'Rapid Fire',
  mixed: 'Mixed',
  mock: 'Mock FLT',
  aptitude: 'Aptitude',
  weekly: 'Weekly',
  monthly: 'Monthly',
  other: 'Other',
}

export const TIER_LABEL: Record<TestTier, string> = { free: 'Free', premium: 'Premium' }

export const KIND_LABEL: Record<TestKind, string> = { test: 'Tests', quiz: 'Quizzes' }

/** Display order of known categories; anything else is appended alphabetically. */
export const CATEGORY_ORDER = [
  'Free for All',
  'Discrete Mathematics',
  'Engineering Mathematics',
  'Digital Logic',
  'DBMS',
  'C Programming',
  'Data Structures',
  'Algorithms',
  'Theory of Computation',
  'Compiler Design',
  'Computer Organization and Architecture',
  'Operating System',
  'Computer Networks',
  'Aptitude',
  'Rapid Fire',
  'Mixed Full Length',
  'Mock FLT',
]

const PALETTE = [
  '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#38bdf8', '#a78bfa',
  '#fb7185', '#2dd4bf', '#f97316', '#84cc16', '#22d3ee', '#e879f9',
]

export function categoryColor(category: string): string {
  const idx = CATEGORY_ORDER.indexOf(category)
  if (idx >= 0) return PALETTE[idx % PALETTE.length]
  let h = 0
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function compareCategories(a: string, b: string): number {
  const ia = CATEGORY_ORDER.indexOf(a)
  const ib = CATEGORY_ORDER.indexOf(b)
  if (ia >= 0 && ib >= 0) return ia - ib
  if (ia >= 0) return -1
  if (ib >= 0) return 1
  return a.localeCompare(b)
}

export type StatusFilter = 'all' | 'not_attempted' | 'attempted' | 'coming_soon'
export type SortKey = 'default' | 'most' | 'least' | 'recent'

export const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All status' },
  { value: 'not_attempted', label: 'Not attempted' },
  { value: 'attempted', label: 'Attempted' },
  { value: 'coming_soon', label: 'Coming soon' },
]

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Default order' },
  { value: 'most', label: 'Most attempts' },
  { value: 'least', label: 'Least attempts' },
  { value: 'recent', label: 'Recently attempted' },
]
