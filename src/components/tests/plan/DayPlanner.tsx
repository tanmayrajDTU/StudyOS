'use client'

import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { addDays, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { CalendarCheck, Copy, Eraser, FlaskConical, Library, Plus, Sunrise } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog, ToastHost, toast, errMsg } from '../ui'
import { SchedulePopover } from '../SchedulePopover'
import { PlanRow, type PlanRowHandlers } from './PlanRow'
import { PlanPicker } from './PlanPicker'
import { UpcomingPanel, type UpcomingHandlers } from './UpcomingPanel'
import { WeekStrip } from './WeekStrip'
import { WEEK_OPTS, countEntries, dayLabel, estimateMinutes, fmt, formatMinutes, weekDays, type DayCounts } from './planUtils'
import {
  todayStr,
  useClearScheduleDay,
  useMoveScheduleItem,
  useOverdue,
  useReorderSchedule,
  useScheduleItem,
  useScheduleItems,
  useSchedule,
  useSetScheduleStatus,
  useTestItems,
  useUnscheduleItem,
  useUpdateTimeSlot,
} from '@/hooks/useTests'
import type { ScheduleEntry } from '@/types/tests'
import '../tests.css'

const subscribeNoop = () => () => {}

/** Renders nothing on the server so local-date state can never mismatch on hydration. */
export default function DayPlanner() {
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false)
  if (!mounted) return <PlannerSkeleton />
  return <Planner />
}

function PlannerSkeleton() {
  return (
    <div className="space-y-6 pb-16" aria-busy="true" aria-label="Loading day plan">
      <Skeleton className="h-14" />
      <Skeleton className="h-[150px]" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-2.5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px]" />)}</div>
        <Skeleton className="h-[260px]" />
      </div>
    </div>
  )
}

function Planner() {
  const reduce = useReducedMotion()
  const [today, setToday] = useState(todayStr)
  const [selected, setSelected] = useState(todayStr)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerKey, setPickerKey] = useState(0)
  const [copyAnchor, setCopyAnchor] = useState<HTMLElement | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [orderOverride, setOrderOverride] = useState<string[] | null>(null)
  const [month, setMonth] = useState<{ from: string; to: string; open: boolean }>({ from: '', to: '', open: false })

  // keep "today" correct across midnight
  useEffect(() => {
    const t = setInterval(() => setToday((prev) => (prev === todayStr() ? prev : todayStr())), 60_000)
    return () => clearInterval(t)
  }, [])

  const week = useMemo(() => weekDays(selected), [selected])
  const weekQ = useSchedule(week[0], week[6])
  const upcomingEnd = useMemo(() => fmt(addDays(parseISO(today), 13)), [today])
  const upcomingQ = useSchedule(today, upcomingEnd)
  const overdueQ = useOverdue(today)
  const monthQ = useSchedule(month.from || week[0], month.to || week[6], month.open)
  const itemsQ = useTestItems()

  const setStatus = useSetScheduleStatus()
  const move = useMoveScheduleItem()
  const unschedule = useUnscheduleItem()
  const reorder = useReorderSchedule()
  const timeSlot = useUpdateTimeSlot()
  const clearDay = useClearScheduleDay()
  const scheduleOne = useScheduleItem()
  const scheduleMany = useScheduleItems()

  const { mutate: mutStatus } = setStatus
  const { mutate: mutMove, mutateAsync: moveAsync } = move
  const { mutate: mutUnschedule } = unschedule
  const { mutate: mutTime } = timeSlot
  const { mutate: mutSchedule } = scheduleOne

  const openPicker = () => {
    setPickerKey((k) => k + 1)
    setPickerOpen(true)
  }

  /* ---------------- derived ---------------- */

  const dayEntries = useMemo(() => {
    const rows = (weekQ.data ?? []).filter((r) => r.planned_date === selected)
    if (orderOverride) {
      const idx = new Map(orderOverride.map((id, i) => [id, i]))
      return rows.sort((a, b) => (idx.get(a.id) ?? 999) - (idx.get(b.id) ?? 999) || a.display_order - b.display_order)
    }
    return rows.sort((a, b) => a.display_order - b.display_order)
  }, [weekQ.data, selected, orderOverride])

  const weekCounts = useMemo(() => {
    const by = new Map<string, ScheduleEntry[]>()
    for (const r of weekQ.data ?? []) by.set(r.planned_date, [...(by.get(r.planned_date) ?? []), r])
    const out = new Map<string, DayCounts>()
    for (const [d, rows] of by) out.set(d, countEntries(rows))
    return out
  }, [weekQ.data])

  const monthDots = useMemo(() => {
    const s = new Set<string>()
    for (const r of monthQ.data ?? []) s.add(r.planned_date)
    for (const r of weekQ.data ?? []) s.add(r.planned_date)
    return s
  }, [monthQ.data, weekQ.data])

  const counts = useMemo(() => countEntries(dayEntries), [dayEntries])
  const remainingMin = dayEntries.filter((e) => e.status === 'planned').reduce((n, e) => n + estimateMinutes(e.item), 0)
  const totalMin = dayEntries.filter((e) => e.status !== 'skipped').reduce((n, e) => n + estimateMinutes(e.item), 0)
  const plannedIds = useMemo(() => new Set(dayEntries.map((e) => e.item_id)), [dayEntries])
  const clearable = dayEntries.some((e) => e.status !== 'done')

  /* ---------------- handlers ---------------- */

  const shiftWeek = (dir: -1 | 1) => {
    setOrderOverride(null)
    setSelected((s) => fmt(addDays(parseISO(s), 7 * dir)))
  }
  const selectDay = (d: string) => {
    setOrderOverride(null)
    setSelected(d)
  }

  const onMonthViewChange = useCallback((monthStart: string, open: boolean) => {
    const s = parseISO(monthStart)
    setMonth({
      from: fmt(startOfWeek(startOfMonth(s), WEEK_OPTS)),
      to: fmt(endOfWeek(endOfMonth(s), WEEK_OPTS)),
      open,
    })
  }, [])

  const rowHandlers: PlanRowHandlers = useMemo(
    () => ({
      onToggleDone: (entry) => {
        const markDone = entry.status !== 'done'
        mutStatus(
          { id: entry.id, status: markDone ? 'done' : 'planned' },
          {
            onSuccess: () =>
              markDone
                ? toast.success(`Done · attempt logged for “${entry.item.title}”`, {
                    label: 'Undo',
                    onClick: () => mutStatus({ id: entry.id, status: 'planned' }, { onError: (e) => toast.error(errMsg(e)) }),
                  })
                : toast.info('Marked as not done · attempt removed'),
            onError: (e) => toast.error(errMsg(e)),
          },
        )
      },
      onToggleSkip: (entry) =>
        mutStatus(
          { id: entry.id, status: entry.status === 'skipped' ? 'planned' : 'skipped' },
          { onError: (e) => toast.error(errMsg(e)) },
        ),
      onMove: (entry, date) =>
        mutMove(
          { id: entry.id, newDate: date },
          {
            onSuccess: () => toast.success(`Moved to ${dayLabel(date, todayStr())}`),
            onError: (e) => toast.error(errMsg(e)),
          },
        ),
      onRemove: (entry) =>
        mutUnschedule(entry.id, {
          onSuccess: () =>
            entry.status === 'done'
              ? toast.info('Removed from plan (the logged attempt is kept)')
              : toast.success('Removed from plan', {
                  label: 'Undo',
                  onClick: () =>
                    mutSchedule(
                      { itemId: entry.item_id, date: entry.planned_date, timeSlot: entry.time_slot },
                      { onError: (e) => toast.error(errMsg(e)) },
                    ),
                }),
          onError: (e) => toast.error(errMsg(e)),
        }),
      onTimeSlot: (entry, slot) =>
        mutTime({ id: entry.id, timeSlot: slot }, { onError: (e) => toast.error(errMsg(e)) }),
    }),
    [mutStatus, mutMove, mutUnschedule, mutTime, mutSchedule],
  )

  const upcomingHandlers: UpcomingHandlers = useMemo(
    () => ({
      onMove: rowHandlers.onMove,
      onRemove: rowHandlers.onRemove,
      onSkip: (entry) => mutStatus({ id: entry.id, status: 'skipped' }, { onError: (e) => toast.error(errMsg(e)) }),
      onSelectDay: (d) => {
        setOrderOverride(null)
        setSelected(d)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      },
    }),
    [rowHandlers, mutStatus],
  )

  const moveAllOverdue = async () => {
    const rows = overdueQ.data ?? []
    let ok = 0
    let failed = 0
    for (const r of rows) {
      try {
        await moveAsync({ id: r.id, newDate: today })
        ok++
      } catch {
        failed++ // usually "already planned today"
      }
    }
    if (ok) toast.success(`Moved ${ok} item${ok === 1 ? '' : 's'} to today`)
    if (failed) toast.error(`${failed} couldn’t be moved (already on today?)`)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = dayEntries.map((d) => d.id)
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    const next = arrayMove(ids, from, to)
    setOrderOverride(next)
    reorder.mutate(
      { date: selected, ids: next },
      {
        onError: (err) => toast.error(errMsg(err)),
        onSettled: () => setOrderOverride(null),
      },
    )
  }

  const addToDay = (itemIds: string[]) =>
    scheduleMany.mutate(
      { itemIds, date: selected },
      {
        onSuccess: (r) => {
          setPickerOpen(false)
          toast.success(r.added > 0 ? `Added ${r.added} item${r.added === 1 ? '' : 's'} to ${dayLabel(selected, today)}` : 'Everything was already on this day')
        },
        onError: (e) => toast.error(errMsg(e)),
      },
    )

  const planTomorrow = () => {
    selectDay(fmt(addDays(parseISO(today), 1)))
    openPicker()
  }

  const copyDay = (date: string) =>
    scheduleMany.mutate(
      { itemIds: dayEntries.map((e) => e.item_id), date },
      {
        onSuccess: (r) =>
          r.added > 0
            ? toast.success(`Copied ${r.added} item${r.added === 1 ? '' : 's'} to ${dayLabel(date, today)}`)
            : toast.info(`Nothing to copy — already planned on ${dayLabel(date, today)}`),
        onError: (e) => toast.error(errMsg(e)),
      },
    )

  const doClear = () =>
    clearDay.mutate(selected, {
      onSuccess: (r) => {
        setConfirmClear(false)
        toast.success(`Cleared ${r.removed} item${r.removed === 1 ? '' : 's'}`)
      },
      onError: (e) => {
        setConfirmClear(false)
        toast.error(errMsg(e))
      },
    })

  /* ---------------- render ---------------- */

  const selDate = parseISO(selected)
  const pct = counts.total ? Math.round((counts.done / counts.total) * 100) : 0
  const quickBtn = 'btn-ghost !py-1.5 disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className="space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarCheck className="h-5.5 w-5.5 text-primary" />
            Day Plan
          </h1>
          <p className="text-sm text-muted-foreground">Schedule tests and quizzes, tick them off, and keep your attempt counts honest.</p>
        </div>
        <Link href="/tests" className="btn-ghost self-start md:self-auto">
          <Library className="h-4 w-4" /> Library
        </Link>
      </div>

      <WeekStrip
        selected={selected}
        today={today}
        counts={weekCounts}
        loading={weekQ.isLoading}
        monthDots={monthDots}
        monthLoading={monthQ.isFetching}
        onSelect={selectDay}
        onShiftWeek={shiftWeek}
        onMonthViewChange={onMonthViewChange}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        {/* Main panel */}
        <section aria-label="Selected day" className="rounded-2xl border border-border bg-card/60 p-3 sm:p-4 space-y-4 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground leading-tight">{dayLabel(selected, today)}</h2>
              <p className="text-xs text-muted-foreground">
                {format(selDate, 'EEEE, d MMMM yyyy')}
                {selected < today && ' · past day'}
              </p>
            </div>
            <button onClick={openPicker} className="btn-primary">
              <Plus className="h-4 w-4" /> Add to this day
            </button>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Quick actions">
            <button onClick={planTomorrow} className={quickBtn}>
              <Sunrise className="h-3.5 w-3.5 text-sky-400" /> Plan tomorrow
            </button>
            <button
              onClick={(e) => setCopyAnchor(copyAnchor ? null : e.currentTarget)}
              disabled={dayEntries.length === 0}
              className={quickBtn}
            >
              <Copy className="h-3.5 w-3.5" /> Copy this plan to…
            </button>
            <button onClick={() => setConfirmClear(true)} disabled={!clearable} className={`${quickBtn} hover:!text-red-400`}>
              <Eraser className="h-3.5 w-3.5" /> Clear day
            </button>
          </div>

          {weekQ.isError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 text-sm">
              <p className="font-semibold text-red-300">Couldn’t load this day’s plan.</p>
              <p className="mt-1 text-muted-foreground">{errMsg(weekQ.error)}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                On a first run, make sure <code className="text-foreground">supabase/tests-quizzes.sql</code> has been executed.
              </p>
              <button onClick={() => weekQ.refetch()} className="btn-ghost mt-3">Try again</button>
            </div>
          ) : weekQ.isLoading ? (
            <div className="space-y-2.5" aria-busy="true">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px]" />)}
            </div>
          ) : dayEntries.length === 0 ? (
            <EmptyState
              icon={<FlaskConical className="h-6 w-6 text-primary" />}
              title="Nothing planned for this day"
              description="Pick tests or quizzes from your library to build the day’s plan."
              actionLabel="Add tests & quizzes"
              onAction={openPicker}
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={dayEntries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2" aria-label={`Plan for ${format(selDate, 'd MMMM')}`}>
                  <AnimatePresence initial={false}>
                    {dayEntries.map((entry) => (
                      <motion.li
                        key={entry.id}
                        initial={reduce ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? undefined : { opacity: 0, x: -24 }}
                        transition={{ duration: 0.2 }}
                      >
                        <PlanRow
                          entry={entry}
                          handlers={rowHandlers}
                          busy={setStatus.isPending && setStatus.variables?.id === entry.id}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </SortableContext>
            </DndContext>
          )}

          {/* Day summary footer */}
          <footer className="rounded-xl border border-border/70 bg-secondary/40 px-3.5 py-3 space-y-2.5" aria-label="Day summary">
            <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5 text-xs">
              <span className="text-muted-foreground">
                Planned <strong className="text-foreground tabular-nums">{counts.total}</strong>
              </span>
              <span className="text-muted-foreground">
                Done <strong className="text-emerald-300 tabular-nums">{counts.done}</strong>
              </span>
              {counts.skipped > 0 && (
                <span className="text-muted-foreground">
                  Skipped <strong className="text-foreground tabular-nums">{counts.skipped}</strong>
                </span>
              )}
              <span className="text-muted-foreground">
                Est. load{' '}
                <strong className="text-foreground tabular-nums">{formatMinutes(totalMin)}</strong>
                {counts.done > 0 && counts.planned > 0 && (
                  <span className="text-muted-foreground/80"> · {formatMinutes(remainingMin)} left</span>
                )}
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-border"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-label="Day completion"
            >
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
          </footer>
        </section>

        <UpcomingPanel
          today={today}
          overdue={overdueQ.data ?? []}
          upcoming={upcomingQ.data ?? []}
          loadingOverdue={overdueQ.isLoading}
          loadingUpcoming={upcomingQ.isLoading}
          errorUpcoming={upcomingQ.isError}
          handlers={upcomingHandlers}
          onMoveAllOverdue={moveAllOverdue}
        />
      </div>

      <PlanPicker
        key={pickerKey}
        open={pickerOpen}
        date={selected}
        items={itemsQ.data ?? []}
        loading={itemsQ.isLoading}
        plannedIds={plannedIds}
        busy={scheduleMany.isPending}
        onClose={() => setPickerOpen(false)}
        onConfirm={addToDay}
      />

      {copyAnchor && (
        <SchedulePopover anchor={copyAnchor} onClose={() => setCopyAnchor(null)} onPick={copyDay} title="Copy plan to" />
      )}

      <ConfirmDialog
        open={confirmClear}
        title={`Clear ${dayLabel(selected, today).toLowerCase()}?`}
        message="This removes every planned or skipped item from this day. Items already marked done stay as history."
        confirmLabel="Clear day"
        busy={clearDay.isPending}
        onConfirm={doClear}
        onClose={() => setConfirmClear(false)}
      />

      <ToastHost />
    </div>
  )
}
