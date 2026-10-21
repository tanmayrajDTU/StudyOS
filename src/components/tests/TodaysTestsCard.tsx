'use client'

import React, { Component, Suspense, useState, type ErrorInfo, type ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, Check, FlaskConical } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ToastHost, toast, errMsg } from './ui'
import { SERIES_LABEL } from './constants'
import { todayStr, useOverdue, useSchedule, useSetScheduleStatus } from '@/hooks/useTests'
import './tests.css'

/* ------------------------------------------------------------------ */

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('TodaysTestsCard failed:', error, info.componentStack)
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="rounded-card border border-border/40 bg-card p-4 text-xs text-muted-foreground flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
        Today’s tests couldn’t be shown right now.
        <button onClick={() => this.setState({ failed: false })} className="ml-auto font-semibold text-primary hover:underline cursor-pointer">
          Retry
        </button>
      </div>
    )
  }
}

function CardSkeleton() {
  return (
    <div className="rounded-card border border-border/40 bg-card p-5 space-y-3" aria-busy="true" aria-label="Loading today’s tests">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
    </div>
  )
}

function Inner() {
  // "today" is fixed per mount; a day change is picked up on the next visit.
  const [today] = useState(todayStr)
  const todayQ = useSchedule(today, today)
  const overdueQ = useOverdue(today)
  const setStatus = useSetScheduleStatus()

  if (todayQ.isLoading) return <CardSkeleton />

  if (todayQ.isError) {
    return (
      <div role="alert" className="rounded-card border border-border/40 bg-card p-4 text-xs text-muted-foreground flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
        Couldn’t load today’s tests.
        <button onClick={() => todayQ.refetch()} className="ml-auto font-semibold text-primary hover:underline cursor-pointer">
          Retry
        </button>
      </div>
    )
  }

  const rows = (todayQ.data ?? []).filter((r) => r.planned_date === today).sort((a, b) => a.display_order - b.display_order)
  const done = rows.filter((r) => r.status === 'done').length
  const overdue = overdueQ.data?.length ?? 0

  const markDone = (id: string, title: string) =>
    setStatus.mutate(
      { id, status: 'done' },
      {
        onSuccess: () => toast.success(`Done · attempt logged for “${title}”`),
        onError: (e) => toast.error(errMsg(e)),
      },
    )

  return (
    <section aria-label="Today’s tests" className="rounded-card border border-border/40 bg-card p-5 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground tracking-widest font-mono">
          <FlaskConical className="h-3.5 w-3.5 text-primary" /> Today’s Tests
          {rows.length > 0 && <span className="tabular-nums text-foreground">{done}/{rows.length}</span>}
        </h3>
        <div className="flex items-center gap-3">
          {overdue > 0 && (
            <Link
              href="/tests/plan"
              className="inline-flex items-center gap-1 rounded-md bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-300 hover:bg-amber-400/25"
            >
              <AlertTriangle className="h-3 w-3" /> {overdue} overdue
            </Link>
          )}
          <Link href="/tests/plan" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
            Day plan <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nothing scheduled today.{' '}
          <Link href="/tests" className="font-semibold text-primary hover:underline">Plan a test or quiz</Link>
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => {
            const isDone = r.status === 'done'
            const skipped = r.status === 'skipped'
            return (
              <li
                key={r.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                  isDone ? 'border-emerald-400/30 bg-emerald-400/[0.06]' : 'border-border/50 bg-secondary/20'
                } ${skipped ? 'opacity-60' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-xs font-semibold ${isDone ? 'text-muted-foreground line-through' : 'text-foreground'}`} title={r.item.title}>
                    {r.item.title}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {r.time_slot ? `${r.time_slot} · ` : ''}
                    {SERIES_LABEL[r.item.series]} · {r.item.category}
                    {skipped ? ' · skipped' : ''}
                  </p>
                </div>
                {isDone ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} /> Done
                  </span>
                ) : (
                  <button
                    onClick={() => markDone(r.id, r.item.title)}
                    disabled={setStatus.isPending && setStatus.variables?.id === r.id}
                    aria-label={`Mark ${r.item.title} as done`}
                    className="btn-ghost !py-1 !px-2.5 !text-[11px] disabled:opacity-50 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <Check className="h-3 w-3" /> Done
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <ToastHost />
    </section>
  )
}

/** Self-contained dashboard widget: its own error boundary + Suspense, so it can never break the dashboard. */
export default function TodaysTestsCard() {
  return (
    <Boundary>
      <Suspense fallback={<CardSkeleton />}>
        <Inner />
      </Suspense>
    </Boundary>
  )
}
