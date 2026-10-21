'use client'

import React, { memo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, CalendarClock, Clock, ExternalLink, GripVertical, RotateCcw, SkipForward, Trash2, X } from 'lucide-react'
import { Popover } from '../ui'
import { SchedulePopover } from '../SchedulePopover'
import { SERIES_LABEL, categoryColor } from '../constants'
import { useAttempts } from '@/hooks/useTests'
import type { ScheduleEntry } from '@/types/tests'
import { estimateMinutes, formatMinutes } from './planUtils'

export interface PlanRowHandlers {
  onToggleDone: (entry: ScheduleEntry) => void
  onToggleSkip: (entry: ScheduleEntry) => void
  onMove: (entry: ScheduleEntry, date: string) => void
  onRemove: (entry: ScheduleEntry) => void
  onTimeSlot: (entry: ScheduleEntry, slot: string | null) => void
}

/** "Attempt #n": position of the linked attempt in the item's history, falling back to the total count. */
export function AttemptBadge({ entry }: { entry: ScheduleEntry }) {
  const { data } = useAttempts(entry.item_id, entry.status === 'done' && !!entry.attempt_id)
  let n = entry.item.attempt_count
  if (data && entry.attempt_id) {
    const idx = data.findIndex((a) => a.id === entry.attempt_id)
    if (idx >= 0) n = data.length - idx
  }
  if (n <= 0) return null
  return (
    <span className="inline-flex items-center rounded-md bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 tabular-nums">
      Attempt #{n}
    </span>
  )
}

function TimeSlotEditor({
  anchor,
  value,
  onClose,
  onSave,
}: {
  anchor: HTMLElement | null
  value: string | null
  onClose: () => void
  onSave: (slot: string | null) => void
}) {
  const [draft, setDraft] = useState(value ?? '')
  return (
    <Popover anchor={anchor} onClose={onClose} width={220} label="Time slot">
      <div className="space-y-2 p-1.5">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="plan-time-input">
          Time slot
        </label>
        <input
          id="plan-time-input"
          type="time"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="field-input"
        />
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              onSave(draft || null)
              onClose()
            }}
            className="btn-primary flex-1 !py-1.5"
          >
            Save
          </button>
          {value && (
            <button
              onClick={() => {
                onSave(null)
                onClose()
              }}
              className="btn-ghost !py-1.5"
              aria-label="Clear time slot"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </Popover>
  )
}

interface Props {
  entry: ScheduleEntry
  handlers: PlanRowHandlers
  busy?: boolean
}

function PlanRowImpl({ entry, handlers, busy }: Props) {
  const reduce = useReducedMotion()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id })
  const [moveAnchor, setMoveAnchor] = useState<HTMLElement | null>(null)
  const [timeAnchor, setTimeAnchor] = useState<HTMLElement | null>(null)

  const { item } = entry
  const done = entry.status === 'done'
  const skipped = entry.status === 'skipped'
  const color = categoryColor(item.category)

  const iconBtn =
    'rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-primary'

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'relative z-10' : 'relative'}
    >
      <motion.div
        animate={{
          backgroundColor: done ? 'rgba(52, 211, 153, 0.07)' : 'rgba(0,0,0,0)',
          borderColor: done ? 'rgba(52, 211, 153, 0.35)' : 'rgba(129, 140, 248, 0.14)',
        }}
        transition={{ duration: reduce ? 0 : 0.35 }}
        className={`relative flex items-start gap-2 sm:gap-3 rounded-xl border bg-card px-2 sm:px-3 py-3 ${
          isDragging ? 'shadow-2xl shadow-black/50 ring-1 ring-primary/50' : ''
        } ${skipped ? 'opacity-60' : ''}`}
      >
        <span
          aria-hidden
          className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full"
          style={{ background: color, opacity: done ? 0.9 : 0.4 }}
        />

        <button
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${item.title}. Press space to pick up, arrow keys to move.`}
          className="mt-0.5 touch-none rounded-md p-1 text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-primary"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          onClick={() => handlers.onToggleDone(entry)}
          disabled={busy}
          role="checkbox"
          aria-checked={done}
          aria-label={done ? `Mark ${item.title} as not done` : `Mark ${item.title} as done`}
          className={`relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait ${
            done ? 'border-emerald-400 bg-emerald-400 text-background' : 'border-border hover:border-primary'
          }`}
        >
          {done && (
            <>
              {!reduce && (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full border-2 border-emerald-400"
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 2.1, opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              )}
              <motion.span
                initial={reduce ? false : { scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 16 }}
                className="flex"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
              </motion.span>
            </>
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-1.5">
          <p className={`text-sm font-semibold leading-snug break-words ${done || skipped ? 'text-muted-foreground' : 'text-foreground'} ${done ? 'line-through decoration-emerald-400/50' : ''}`}>
            {item.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ color, borderColor: `${color}40`, background: `${color}14` }}
            >
              {SERIES_LABEL[item.series]}
            </span>
            <span className="text-[11px] text-muted-foreground">{item.category}</span>
            <span className="text-[11px] text-muted-foreground/70">· ~{formatMinutes(estimateMinutes(item))}</span>
            {done && <AttemptBadge entry={entry} />}
            {skipped && (
              <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">Skipped</span>
            )}
            {!done && item.attempt_count > 0 && (
              <span className="text-[11px] text-muted-foreground/80">Attempted ×{item.attempt_count}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-0.5 shrink-0 max-w-[132px] sm:max-w-none">
          <button
            onClick={(e) => setTimeAnchor(timeAnchor ? null : e.currentTarget)}
            aria-label={entry.time_slot ? `Time slot ${entry.time_slot}, change` : 'Set time slot'}
            className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-1.5 text-xs font-semibold tabular-nums cursor-pointer hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary ${
              entry.time_slot ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            {entry.time_slot && <span>{entry.time_slot}</span>}
          </button>
          {!done && (
            <button
              onClick={() => handlers.onToggleSkip(entry)}
              disabled={busy}
              aria-label={skipped ? `Restore ${item.title}` : `Skip ${item.title}`}
              title={skipped ? 'Restore' : 'Skip'}
              className={iconBtn}
            >
              {skipped ? <RotateCcw className="h-4 w-4" /> : <SkipForward className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={(e) => setMoveAnchor(moveAnchor ? null : e.currentTarget)}
            aria-label={`Move ${item.title} to another date`}
            title="Move to another date"
            className={iconBtn}
          >
            <CalendarClock className="h-4 w-4" />
          </button>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${item.title}`}
              className={iconBtn}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={() => handlers.onRemove(entry)}
            disabled={busy}
            aria-label={`Remove ${item.title} from plan`}
            title="Remove"
            className={`${iconBtn} hover:!text-red-400`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      {moveAnchor && (
        <SchedulePopover
          anchor={moveAnchor}
          onClose={() => setMoveAnchor(null)}
          onPick={(d) => handlers.onMove(entry, d)}
          title="Move to"
        />
      )}
      {timeAnchor && (
        <TimeSlotEditor
          anchor={timeAnchor}
          value={entry.time_slot}
          onClose={() => setTimeAnchor(null)}
          onSave={(slot) => handlers.onTimeSlot(entry, slot)}
        />
      )}
    </div>
  )
}

export const PlanRow = memo(PlanRowImpl)
