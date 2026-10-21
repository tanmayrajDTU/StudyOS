'use client'

import React, { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { AlertTriangle, CalendarClock, CalendarDays, SkipForward, Sun, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { SchedulePopover } from '../SchedulePopover'
import { categoryColor } from '../constants'
import type { ScheduleEntry } from '@/types/tests'
import { dayLabel, groupByDate } from './planUtils'

export interface UpcomingHandlers {
  onMove: (entry: ScheduleEntry, date: string) => void
  onRemove: (entry: ScheduleEntry) => void
  onSkip: (entry: ScheduleEntry) => void
  onSelectDay: (date: string) => void
}

const iconBtn =
  'rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-primary'

function MiniRow({
  entry,
  today,
  handlers,
  overdue,
}: {
  entry: ScheduleEntry
  today: string
  handlers: UpcomingHandlers
  overdue?: boolean
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const color = categoryColor(entry.item.category)
  return (
    <li className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 py-1.5 pl-2.5 pr-1">
      <span aria-hidden className="h-6 w-[3px] shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground" title={entry.item.title}>
          {entry.item.title}
        </p>
        <p className="truncate text-[10px] text-muted-foreground">
          {entry.status === 'skipped' ? 'Skipped · ' : ''}
          {entry.time_slot ? `${entry.time_slot} · ` : ''}
          {entry.item.category}
        </p>
      </div>
      {overdue ? (
        <>
          <button
            onClick={() => handlers.onMove(entry, today)}
            aria-label={`Move ${entry.item.title} to today`}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/25 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Sun className="h-3 w-3" /> Today
          </button>
          <button onClick={() => handlers.onSkip(entry)} aria-label={`Skip ${entry.item.title}`} title="Skip" className={iconBtn}>
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <button
            onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
            aria-label={`Move ${entry.item.title} to another date`}
            title="Move"
            className={iconBtn}
          >
            <CalendarClock className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handlers.onRemove(entry)}
            aria-label={`Remove ${entry.item.title} from plan`}
            title="Remove"
            className={`${iconBtn} hover:!text-red-400`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
      {anchor && (
        <SchedulePopover
          anchor={anchor}
          onClose={() => setAnchor(null)}
          onPick={(d) => handlers.onMove(entry, d)}
          title="Move to"
        />
      )}
    </li>
  )
}

interface Props {
  today: string
  overdue: ScheduleEntry[]
  upcoming: ScheduleEntry[]
  loadingOverdue: boolean
  loadingUpcoming: boolean
  errorUpcoming: boolean
  handlers: UpcomingHandlers
  onMoveAllOverdue: () => void
}

export function UpcomingPanel({
  today,
  overdue,
  upcoming,
  loadingOverdue,
  loadingUpcoming,
  errorUpcoming,
  handlers,
  onMoveAllOverdue,
}: Props) {
  const groups = useMemo(
    () => [...groupByDate(upcoming.filter((e) => e.status !== 'done')).entries()].sort((a, b) => a[0].localeCompare(b[0])),
    [upcoming],
  )

  return (
    <aside aria-label="Upcoming and overdue" className="space-y-4">
      {(loadingOverdue || overdue.length > 0) && (
        <section className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.04] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" /> Overdue
              {!loadingOverdue && <span className="tabular-nums">({overdue.length})</span>}
            </h2>
            {overdue.length > 1 && (
              <button onClick={onMoveAllOverdue} className="text-[11px] font-semibold text-primary hover:underline cursor-pointer">
                Move all to today
              </button>
            )}
          </div>
          {loadingOverdue ? (
            <Skeleton className="h-10" />
          ) : (
            <ul className="space-y-1.5 max-h-[280px] overflow-y-auto pr-0.5">
              {overdue.map((e) => (
                <MiniRow key={e.id} entry={e} today={today} handlers={handlers} overdue />
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-3.5 space-y-3">
        <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" /> Upcoming · next 14 days
        </h2>
        {loadingUpcoming ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : errorUpcoming ? (
          <p className="text-xs text-red-300">Couldn’t load upcoming plans.</p>
        ) : groups.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing planned in the next two weeks.</p>
        ) : (
          <div className="space-y-3">
            {groups.map(([date, rows]) => (
              <div key={date} className="space-y-1.5">
                <button
                  onClick={() => handlers.onSelectDay(date)}
                  className="flex w-full items-baseline justify-between text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-primary rounded"
                  aria-label={`Open ${format(parseISO(date), 'EEEE d MMMM')}`}
                >
                  <span className="text-[11px] font-bold text-foreground">{dayLabel(date, today)}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {format(parseISO(date), 'd MMM')} · {rows.length}
                  </span>
                </button>
                <ul className="space-y-1.5">
                  {rows.map((e) => (
                    <MiniRow key={e.id} entry={e} today={today} handlers={handlers} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </aside>
  )
}
