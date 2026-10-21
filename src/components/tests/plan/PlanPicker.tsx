'use client'

import React, { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarCheck, Check, Lock, Search } from 'lucide-react'
import { Modal } from '../ui'
import { KIND_LABEL, SERIES_LABEL, categoryColor, compareCategories } from '../constants'
import { TEST_KINDS, type TestItemWithStats, type TestKind } from '@/types/tests'

/** The parent re-keys this component on every open, so selection/search always start fresh. */
interface Props {
  open: boolean
  date: string
  items: TestItemWithStats[]
  loading: boolean
  /** Item ids already on `date` (shown as already planned, not selectable). */
  plannedIds: Set<string>
  busy: boolean
  onClose: () => void
  onConfirm: (itemIds: string[]) => void
}

/** Rank: available + never attempted first, then available by fewest attempts, coming-soon last. */
function rank(it: TestItemWithStats): number {
  if (!it.is_available) return 3
  return it.attempt_count === 0 ? 0 : 1
}

export function PlanPicker({ open, date, items, loading, plannedIds, busy, onClose, onConfirm }: Props) {
  const [kind, setKind] = useState<TestKind>('test')
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const kindItems = useMemo(() => items.filter((i) => i.kind === kind), [items, kind])
  const categories = useMemo(() => [...new Set(kindItems.map((i) => i.category))].sort(compareCategories), [kindItems])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return kindItems
      .filter((it) => {
        if (category !== 'all' && it.category !== category) return false
        if (q && !`${it.title} ${it.topics ?? ''} ${it.category}`.toLowerCase().includes(q)) return false
        return true
      })
      .sort(
        (a, b) =>
          rank(a) - rank(b) ||
          (rank(a) === 1 ? a.attempt_count - b.attempt_count : 0) ||
          compareCategories(a.category, b.category) ||
          a.display_order - b.display_order,
      )
  }, [kindItems, category, query])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const selectableVisible = visible.filter((i) => i.is_available && !plannedIds.has(i.id))
  const allSelected = selectableVisible.length > 0 && selectableVisible.every((i) => selected.has(i.id))
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) selectableVisible.forEach((i) => next.delete(i.id))
      else selectableVisible.forEach((i) => next.add(i.id))
      return next
    })

  const count = selected.size

  return (
    <Modal
      open={open}
      onClose={onClose}
      side="right"
      title="Add to this day"
      description={format(parseISO(date), 'EEEE, d MMMM')}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={() => onConfirm([...selected])}
            disabled={count === 0 || busy}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Adding…' : count === 0 ? 'Select items' : `Add ${count} item${count === 1 ? '' : 's'}`}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div role="tablist" aria-label="Library type" className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-secondary/50 p-1">
          {TEST_KINDS.map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={kind === k}
              onClick={() => {
                setKind(k)
                setCategory('all')
              }}
              className={`rounded-lg py-1.5 text-xs font-semibold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                kind === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {KIND_LABEL[k]}
              <span className="ml-1.5 opacity-70 tabular-nums">{items.filter((i) => i.kind === k).length}</span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or topics…"
            aria-label="Search library"
            className="field-input !pl-9"
          />
        </div>

        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category" className="field-input">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{visible.length} shown · never-attempted first</span>
          <button
            onClick={toggleAll}
            disabled={selectableVisible.length === 0}
            className="font-semibold text-primary hover:underline cursor-pointer disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
          >
            {allSelected ? 'Clear shown' : 'Select all shown'}
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/40" />)}
          </div>
        ) : visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nothing matches. Try a different search or category.
          </p>
        ) : (
          <ul className="space-y-1.5" aria-label="Library items">
            {visible.map((it) => {
              const planned = plannedIds.has(it.id)
              const soon = !it.is_available
              const disabled = planned || soon
              const isSel = selected.has(it.id)
              const color = categoryColor(it.category)
              return (
                <li key={it.id} className="tq-row">
                  <button
                    onClick={() => toggle(it.id)}
                    disabled={disabled}
                    role="checkbox"
                    aria-checked={isSel || planned}
                    className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary ${
                      isSel ? 'border-primary/60 bg-primary/10' : 'border-border/70 hover:bg-secondary/60'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border ${
                        isSel || planned ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                      }`}
                      style={{ width: 18, height: 18 }}
                    >
                      {(isSel || planned) && <Check className="h-3 w-3" strokeWidth={3.5} />}
                    </span>
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="block text-[13px] font-semibold leading-snug text-foreground break-words">{it.title}</span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
                        <span className="font-bold uppercase tracking-wide" style={{ color }}>{SERIES_LABEL[it.series]}</span>
                        <span className="text-muted-foreground">{it.category}</span>
                        {soon ? (
                          <span className="inline-flex items-center gap-1 font-bold uppercase text-muted-foreground">
                            <Lock className="h-2.5 w-2.5" /> Coming soon
                          </span>
                        ) : it.attempt_count === 0 ? (
                          <span className="rounded bg-amber-400/15 px-1.5 py-0.5 font-bold uppercase text-amber-300">New</span>
                        ) : (
                          <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 font-bold text-emerald-300 tabular-nums">
                            ×{it.attempt_count}
                          </span>
                        )}
                        {planned && (
                          <span className="inline-flex items-center gap-1 font-bold text-primary">
                            <CalendarCheck className="h-2.5 w-2.5" /> Already on this day
                          </span>
                        )}
                        {!planned && it.next_scheduled_date && (
                          <span className="text-primary/80">Planned {format(parseISO(it.next_scheduled_date), 'd MMM')}</span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}
