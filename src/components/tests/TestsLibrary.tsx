'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { animate, AnimatePresence, motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import {
  ChevronDown,
  CloudDownload,
  FlaskConical,
  ListChecks,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Target,
  X,
  Zap,
  ChevronsDownUp,
  ChevronsUpDown,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog, MenuItem, Popover, ToastHost, toast, errMsg } from './ui'
import { TestRow, type RowHandlers } from './TestRow'
import { ItemFormModal } from './ItemFormModal'
import { AttemptFormModal } from './AttemptFormModal'
import { AttemptHistoryDrawer } from './AttemptHistoryDrawer'
import {
  KIND_LABEL,
  SERIES_LABEL,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  TIER_LABEL,
  categoryColor,
  compareCategories,
  type SortKey,
  type StatusFilter,
} from './constants'
import {
  testsKeys,
  useDeleteAttempt,
  useDeleteItem,
  useLogAttempt,
  useScheduleItem,
  useSeedLibrary,
  useTestItems,
  useUpdateItem,
} from '@/hooks/useTests'
import { getAttempts } from '@/actions/tests'
import { computeLibraryStats } from '@/lib/tests-stats'
import { TEST_SERIES, TEST_TIERS, type TestItemWithStats, type TestKind } from '@/types/tests'
import './tests.css'

/* ------------------------------------------------------------------ */

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.7,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    prev.current = value
    return () => controls.stop()
  }, [value])
  return <span className="tabular-nums">{display}{suffix}</span>
}

function StatCard({ icon: Icon, label, children, accent }: { icon: React.ElementType; label: string; children: React.ReactNode; accent: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3.5 flex items-center gap-3.5">
      <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}1f`, color: accent }}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xl font-bold text-foreground leading-none">{children}</div>
        <div className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export default function TestsLibrary() {
  const qc = useQueryClient()
  const { data: items = [], isLoading, isError, error, refetch, isFetching } = useTestItems()

  const logAttempt = useLogAttempt()
  const deleteAttempt = useDeleteAttempt()
  const updateItem = useUpdateItem()
  const deleteItem = useDeleteItem()
  const scheduleItem = useScheduleItem()
  const seed = useSeedLibrary()

  // view state
  const [kind, setKind] = useState<TestKind>('test')
  const [category, setCategory] = useState<string>('all')
  const [series, setSeries] = useState<string>('all')
  const [tier, setTier] = useState<string>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortKey>('default')
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string> | null>(null) // null = apply default
  const searchRef = useRef<HTMLInputElement>(null)

  // dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TestItemWithStats | null>(null)
  const [deleting, setDeleting] = useState<TestItemWithStats | null>(null)
  const [detailsFor, setDetailsFor] = useState<TestItemWithStats | null>(null)
  const [historyFor, setHistoryFor] = useState<TestItemWithStats | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 180)
    return () => clearTimeout(t)
  }, [query])

  // "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const stats = useMemo(() => computeLibraryStats(items), [items])
  const kindItems = useMemo(() => items.filter((i) => i.kind === kind), [items, kind])
  const counts = useMemo(() => ({
    test: items.filter((i) => i.kind === 'test').length,
    quiz: items.filter((i) => i.kind === 'quiz').length,
  }), [items])

  const categoryList = useMemo(() => {
    const map = new Map<string, { total: number; attempted: number }>()
    for (const it of kindItems) {
      const c = map.get(it.category) ?? { total: 0, attempted: 0 }
      c.total += 1
      if (it.attempt_count > 0) c.attempted += 1
      map.set(it.category, c)
    }
    return [...map.entries()].sort((a, b) => compareCategories(a[0], b[0]))
  }, [kindItems])

  const allCategories = useMemo(() => [...new Set(items.map((i) => i.category))].sort(compareCategories), [items])

  const filtersActive = category !== 'all' || series !== 'all' || tier !== 'all' || status !== 'all' || debounced !== ''

  const groups = useMemo(() => {
    const filtered = kindItems.filter((it) => {
      if (category !== 'all' && it.category !== category) return false
      if (series !== 'all' && it.series !== series) return false
      if (tier !== 'all' && it.tier !== tier) return false
      if (status === 'not_attempted' && (it.attempt_count > 0 || !it.is_available)) return false
      if (status === 'attempted' && it.attempt_count === 0) return false
      if (status === 'coming_soon' && it.is_available) return false
      if (debounced && !`${it.title} ${it.topics ?? ''}`.toLowerCase().includes(debounced)) return false
      return true
    })
    const sorters: Record<SortKey, (a: TestItemWithStats, b: TestItemWithStats) => number> = {
      default: (a, b) => a.display_order - b.display_order || a.title.localeCompare(b.title),
      most: (a, b) => b.attempt_count - a.attempt_count || a.display_order - b.display_order,
      least: (a, b) => a.attempt_count - b.attempt_count || a.display_order - b.display_order,
      recent: (a, b) => (b.last_attempted_at ?? '').localeCompare(a.last_attempted_at ?? '') || a.display_order - b.display_order,
    }
    const byCat = new Map<string, TestItemWithStats[]>()
    for (const it of filtered) byCat.set(it.category, [...(byCat.get(it.category) ?? []), it])
    return [...byCat.entries()]
      .sort((a, b) => compareCategories(a[0], b[0]))
      .map(([cat, rows]) => ({ category: cat, rows: rows.sort(sorters[sort]) }))
  }, [kindItems, category, series, tier, status, debounced, sort])

  const shownCount = groups.reduce((n, g) => n + g.rows.length, 0)

  // default: first group expanded, rest collapsed; any active filter expands everything
  const isCollapsed = useCallback(
    (cat: string, idx: number) => {
      if (filtersActive) return false
      if (collapsed) return collapsed.has(cat)
      return idx !== 0
    },
    [collapsed, filtersActive],
  )

  const toggleGroup = (cat: string, idx: number) => {
    setCollapsed((prev) => {
      const base = prev ?? new Set(groups.map((g) => g.category).filter((_, i) => i !== 0))
      const next = new Set(base)
      if (isCollapsed(cat, idx)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }
  const expandAll = () => setCollapsed(new Set())
  const collapseAll = () => setCollapsed(new Set(groups.map((g) => g.category)))

  const resetFilters = () => {
    setCategory('all'); setSeries('all'); setTier('all'); setStatus('all'); setQuery('')
  }

  const switchKind = (k: TestKind) => {
    setKind(k)
    setCategory('all')
    setCollapsed(null)
  }

  /* ---------------- handlers ---------------- */

  const handlers: RowHandlers = useMemo(
    () => ({
      onQuickAttempt: (item) => {
        logAttempt.mutate(
          { itemId: item.id },
          {
            onSuccess: (attempt) =>
              toast.success(`Attempt logged for “${item.title}”`, {
                label: 'Undo',
                onClick: () => deleteAttempt.mutate({ id: attempt.id, itemId: item.id }),
              }),
            onError: (e) => toast.error(errMsg(e)),
          },
        )
      },
      onRemoveAttempt: async (item) => {
        try {
          const attempts = await qc.fetchQuery({ queryKey: testsKeys.attempts(item.id), queryFn: () => getAttempts(item.id), staleTime: 0 })
          const latest = attempts[0]
          if (!latest) return toast.info('No attempts to remove')
          deleteAttempt.mutate(
            { id: latest.id, itemId: item.id },
            {
              onSuccess: () => toast.info(`Removed last attempt (${format(parseISO(latest.attempted_at), 'd MMM')})`),
              onError: (e) => toast.error(errMsg(e)),
            },
          )
        } catch (e) {
          toast.error(errMsg(e))
        }
      },
      onLogDetails: (item) => setDetailsFor(item),
      onHistory: (item) => setHistoryFor(item),
      onEdit: (item) => { setEditing(item); setFormOpen(true) },
      onDelete: (item) => setDeleting(item),
      onSchedule: (item, date) =>
        scheduleItem.mutate(
          { itemId: item.id, date },
          {
            onSuccess: () => toast.success(`Planned for ${format(parseISO(date), 'EEE, d MMM')}`),
            onError: (e) => toast.error(errMsg(e)),
          },
        ),
      onRename: (item, patch) =>
        updateItem.mutate(
          { id: item.id, ...patch },
          { onError: (e) => toast.error(errMsg(e)) },
        ),
    }),
    // mutation objects are stable enough; qc is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qc],
  )

  const runSeed = () => {
    setMenuAnchor(null)
    seed.mutate(undefined, {
      onSuccess: (r) =>
        toast.success(r.inserted > 0 ? `Added ${r.inserted} new items (${r.skipped} already existed)` : `Library already up to date (${r.skipped} items)`),
      onError: (e) => toast.error(errMsg(e)),
    })
  }

  const openAdd = () => { setEditing(null); setFormOpen(true) }

  /* ---------------- render ---------------- */

  const completion = stats.total ? Math.round((stats.attempted / stats.total) * 100) : 0

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FlaskConical className="h-5.5 w-5.5 text-primary" />
            Tests &amp; Quizzes
          </h1>
          <p className="text-sm text-muted-foreground">
            Your full test-series library: track attempts, plan what to give today and in the coming days.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button onClick={openAdd} className="btn-primary"><Plus className="h-4 w-4" /> Add</button>
          <button
            aria-label="Library options"
            onClick={(e) => setMenuAnchor(menuAnchor ? null : e.currentTarget)}
            className="btn-ghost !px-2.5"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuAnchor && (
            <Popover anchor={menuAnchor} onClose={() => setMenuAnchor(null)} width={230} label="Library options">
              <MenuItem icon={<CloudDownload className="h-3.5 w-3.5" />} onClick={runSeed}>
                {seed.isPending ? 'Syncing…' : 'Sync built-in library'}
              </MenuItem>
              <MenuItem icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => { setMenuAnchor(null); refetch() }}>
                Refresh
              </MenuItem>
            </Popover>
          )}
        </div>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-sm">
          <p className="font-semibold text-red-300">Couldn’t load your tests library.</p>
          <p className="mt-1 text-muted-foreground">{errMsg(error)}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            If this is the first run, make sure you executed <code className="text-foreground">supabase/tests-quizzes.sql</code> in the Supabase SQL editor.
          </p>
          <button onClick={() => refetch()} className="btn-ghost mt-4">Try again</button>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[74px]" />)}</div>
          <Skeleton className="h-11" />
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Your library is empty"
          description="Load the built-in GO Classes test series (134 tests and 133 quizzes). Safe to run again; it never overwrites your edits."
          actionLabel={seed.isPending ? 'Loading…' : 'Load my tests & quizzes'}
          onAction={runSeed}
          icon={<CloudDownload className="h-6 w-6 text-primary" />}
        />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={ListChecks} label="Total tests & quizzes" accent="#818cf8"><AnimatedNumber value={stats.total} /></StatCard>
            <StatCard icon={Target} label="Attempted at least once" accent="#34d399"><AnimatedNumber value={stats.attempted} /></StatCard>
            <StatCard icon={Zap} label="Library completion" accent="#fbbf24"><AnimatedNumber value={completion} suffix="%" /></StatCard>
            <StatCard icon={FlaskConical} label="Total attempts logged" accent="#f472b6"><AnimatedNumber value={stats.totalAttempts} /></StatCard>
          </div>

          {/* Tabs + search */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex items-center gap-1 bg-secondary/35 p-1 rounded-xl border border-border/40 self-start text-xs font-semibold">
              {(['test', 'quiz'] as TestKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => switchKind(k)}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    kind === k ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {KIND_LABEL[k]} <span className="ml-1 text-muted-foreground tabular-nums">{counts[k]}</span>
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${KIND_LABEL[kind].toLowerCase()} by title or topic…  ( / )`}
                aria-label="Search"
                className="field-input !pl-9 !pr-8"
              />
              {query && (
                <button aria-label="Clear search" onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category chips */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Category">
            <button
              role="tab"
              aria-selected={category === 'all'}
              onClick={() => setCategory('all')}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                category === 'all' ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              All <span className="tabular-nums opacity-70">{kindItems.length}</span>
            </button>
            {categoryList.map(([cat, c]) => {
              const col = categoryColor(cat)
              const active = category === cat
              return (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(active ? 'all' : cat)}
                  className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors hover:brightness-125"
                  style={{
                    borderColor: active ? col : 'var(--border)',
                    background: active ? `${col}22` : 'transparent',
                    color: active ? col : 'var(--muted-foreground)',
                  }}
                >
                  {cat} <span className="tabular-nums opacity-70">{c.attempted}/{c.total}</span>
                </button>
              )
            })}
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select aria-label="Series" value={series} onChange={(e) => setSeries(e.target.value)} className="field-input !w-auto !py-1.5">
              <option value="all">All series</option>
              {TEST_SERIES.map((s) => <option key={s} value={s}>{SERIES_LABEL[s]}</option>)}
            </select>
            <select aria-label="Tier" value={tier} onChange={(e) => setTier(e.target.value)} className="field-input !w-auto !py-1.5">
              <option value="all">Free + Premium</option>
              {TEST_TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
            </select>
            <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="field-input !w-auto !py-1.5">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="field-input !w-auto !py-1.5">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {filtersActive && (
              <button onClick={resetFilters} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold text-primary hover:bg-primary/10 cursor-pointer">
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
            <span className="ml-auto flex items-center gap-2 text-muted-foreground">
              <span className="tabular-nums">{shownCount} shown</span>
              {!filtersActive && groups.length > 1 && (
                <>
                  <button onClick={expandAll} className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"><ChevronsUpDown className="h-3.5 w-3.5" /> Expand</button>
                  <button onClick={collapseAll} className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"><ChevronsDownUp className="h-3.5 w-3.5" /> Collapse</button>
                </>
              )}
              {isFetching && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            </span>
          </div>

          {/* Groups */}
          {groups.length === 0 ? (
            <EmptyState
              title="Nothing matches"
              description="Try a different search or clear the filters."
              actionLabel="Clear filters"
              onAction={resetFilters}
              icon={<Search className="h-6 w-6 text-primary" />}
            />
          ) : (
            <div className="space-y-4">
              {groups.map((g, idx) => {
                const col = categoryColor(g.category)
                const full = categoryList.find(([c]) => c === g.category)?.[1] ?? { total: g.rows.length, attempted: 0 }
                const pct = full.total ? (full.attempted / full.total) * 100 : 0
                const closed = isCollapsed(g.category, idx)
                return (
                  <section key={g.category} className="rounded-2xl border border-border bg-card" style={{ ['--subject-color' as string]: col }}>
                    <button
                      onClick={() => toggleGroup(g.category, idx)}
                      aria-expanded={!closed}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left cursor-pointer"
                    >
                      <span className="h-8 w-1.5 rounded-full" style={{ background: col }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-foreground truncate">{g.category}</h2>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {g.rows.length !== full.total ? `${g.rows.length} of ${full.total}` : full.total}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 max-w-[260px] rounded-full bg-secondary overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: col }}
                              initial={false}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold tabular-nums" style={{ color: col }}>
                            {full.attempted}/{full.total} attempted
                          </span>
                        </div>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${closed ? '-rotate-90' : ''}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {!closed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden rounded-b-2xl border-t border-border/60"
                        >
                          {g.rows.map((it) => (
                            <TestRow key={it.id} item={it} color={col} handlers={handlers} />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <ItemFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        item={editing}
        defaultKind={kind}
        defaultCategory={category !== 'all' ? category : undefined}
        categories={allCategories}
      />
      {detailsFor && (
        <AttemptFormModal open onClose={() => setDetailsFor(null)} itemId={detailsFor.id} itemTitle={detailsFor.title} />
      )}
      <AttemptHistoryDrawer item={historyFor} onClose={() => setHistoryFor(null)} />
      <ConfirmDialog
        open={!!deleting}
        title="Delete this item?"
        message={`“${deleting?.title ?? ''}” and all its attempts and planned days will be permanently removed.`}
        busy={deleteItem.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          deleteItem.mutate(deleting.id, {
            onSuccess: () => { toast.info('Deleted'); setDeleting(null) },
            onError: (e) => toast.error(errMsg(e)),
          })
        }}
      />
      <ToastHost />
    </div>
  )
}
