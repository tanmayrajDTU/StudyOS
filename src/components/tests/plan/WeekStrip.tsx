'use client'

import React, { useMemo, useState } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { WEEK_OPTS, fmt, weekDays, type DayCounts } from './planUtils'

/* ------------------------------------------------------------------ */

function Ring({ done, total, size = 30 }: { done: number; total: number; size?: number }) {
  const stroke = 3
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = total === 0 ? 0 : done / total
  const complete = total > 0 && done === total
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-border" />
      {total > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={`transition-[stroke-dashoffset] duration-500 ${complete ? 'text-emerald-400' : 'text-primary'}`}
          stroke="currentColor"
        />
      )}
    </svg>
  )
}

interface WeekStripProps {
  selected: string
  today: string
  counts: Map<string, DayCounts>
  loading: boolean
  /** Dates (yyyy-MM-dd) that have any planned test, for the month dots. */
  monthDots: Set<string>
  monthLoading: boolean
  onSelect: (date: string) => void
  onShiftWeek: (dir: -1 | 1) => void
  onMonthViewChange: (monthStart: string, open: boolean) => void
}

export function WeekStrip({
  selected,
  today,
  counts,
  loading,
  monthDots,
  monthLoading,
  onSelect,
  onShiftWeek,
  onMonthViewChange,
}: WeekStripProps) {
  const days = useMemo(() => weekDays(selected), [selected])
  const [monthOpen, setMonthOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(parseISO(selected)))

  const first = parseISO(days[0])
  const last = parseISO(days[6])
  const rangeLabel =
    first.getMonth() === last.getMonth()
      ? `${format(first, 'd')} – ${format(last, 'd MMM yyyy')}`
      : `${format(first, 'd MMM')} – ${format(last, 'd MMM yyyy')}`

  const toggleMonth = () => {
    const next = !monthOpen
    const m = startOfMonth(parseISO(selected))
    setMonthOpen(next)
    setViewMonth(m)
    onMonthViewChange(fmt(m), next)
  }

  const shiftMonth = (dir: -1 | 1) => {
    const m = addMonths(viewMonth, dir)
    setViewMonth(m)
    onMonthViewChange(fmt(m), true)
  }

  const gridDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(viewMonth), WEEK_OPTS),
        end: endOfWeek(endOfMonth(viewMonth), WEEK_OPTS),
      }).map(fmt),
    [viewMonth],
  )

  return (
    <section aria-label="Week" className="rounded-2xl border border-border bg-card p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onShiftWeek(-1)}
            aria-label="Previous week"
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[10.5rem] text-center text-sm font-semibold text-foreground tabular-nums" aria-live="polite">
            {rangeLabel}
          </span>
          <button
            onClick={() => onShiftWeek(1)}
            aria-label="Next week"
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelect(today)}
            disabled={selected === today}
            className="btn-ghost !py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Today
          </button>
          <button
            onClick={toggleMonth}
            aria-expanded={monthOpen}
            aria-controls="plan-month"
            className={`btn-ghost !py-1.5 ${monthOpen ? '!bg-secondary' : ''}`}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Month
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((d) => {
          const c = counts.get(d)
          const isSel = d === selected
          const isToday = d === today
          const dt = parseISO(d)
          const label = `${format(dt, 'EEEE d MMMM')}${isToday ? ', today' : ''}: ${
            c ? `${c.done} of ${c.total} done` : 'nothing planned'
          }`
          return (
            <button
              key={d}
              onClick={() => onSelect(d)}
              aria-pressed={isSel}
              aria-label={label}
              className={`relative flex flex-col items-center gap-1 rounded-xl border px-1 py-2 sm:py-2.5 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                isSel
                  ? 'border-primary/60 bg-primary/12'
                  : 'border-transparent hover:bg-secondary'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wide ${isSel ? 'text-primary' : 'text-muted-foreground'}`}>
                {format(dt, 'EEE')}
              </span>
              <span
                className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-sm font-bold tabular-nums ${
                  isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                }`}
              >
                {format(dt, 'd')}
              </span>
              <div className="relative flex h-[30px] w-[30px] items-center justify-center">
                {loading ? (
                  <div className="h-[30px] w-[30px] animate-pulse rounded-full bg-muted/40" />
                ) : (
                  <>
                    <Ring done={c?.done ?? 0} total={c?.total ?? 0} />
                    <span className="absolute text-[10px] font-bold tabular-nums text-foreground">{c?.total ?? 0}</span>
                  </>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {monthOpen && (
        <div id="plan-month" className="border-t border-border/60 pt-3 max-w-sm mx-auto" aria-busy={monthLoading}>
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold text-foreground">{format(viewMonth, 'MMMM yyyy')}</span>
            <button
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-muted-foreground mb-1" aria-hidden>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {gridDays.map((d) => {
              const dt = parseISO(d)
              const inMonth = isSameMonth(dt, viewMonth)
              const isSel = d === selected
              const has = monthDots.has(d)
              return (
                <button
                  key={d}
                  onClick={() => onSelect(d)}
                  aria-pressed={isSel}
                  aria-label={`${format(dt, 'd MMMM yyyy')}${has ? ', has tests planned' : ''}`}
                  className={`relative mx-auto flex h-8 w-8 flex-col items-center justify-center rounded-lg text-xs tabular-nums cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                    isSel
                      ? 'bg-primary text-primary-foreground font-bold'
                      : d === today
                        ? 'ring-1 ring-primary/60 text-foreground font-semibold'
                        : inMonth
                          ? 'text-foreground hover:bg-secondary'
                          : 'text-muted-foreground/40 hover:bg-secondary'
                  }`}
                >
                  {format(dt, 'd')}
                  {has && (
                    <span
                      aria-hidden
                      className={`absolute bottom-0.5 h-1 w-1 rounded-full ${isSel ? 'bg-primary-foreground' : 'bg-primary'}`}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
