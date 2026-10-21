'use client'

import React, { memo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  CalendarPlus,
  CalendarCheck,
  ClipboardPen,
  ExternalLink,
  History,
  Lock,
  MoreHorizontal,
  Minus,
  Pencil,
  Plus,
  Trash2,
  Trophy,
} from 'lucide-react'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { MenuItem, Popover } from './ui'
import { SchedulePopover } from './SchedulePopover'
import { SERIES_LABEL, TIER_LABEL } from './constants'
import type { TestItemWithStats } from '@/types/tests'
import './tests.css'

export interface RowHandlers {
  onQuickAttempt: (item: TestItemWithStats) => void
  onRemoveAttempt: (item: TestItemWithStats) => void
  onLogDetails: (item: TestItemWithStats) => void
  onHistory: (item: TestItemWithStats) => void
  onEdit: (item: TestItemWithStats) => void
  onDelete: (item: TestItemWithStats) => void
  onSchedule: (item: TestItemWithStats, date: string) => void
  onRename: (item: TestItemWithStats, patch: { title?: string; topics?: string }) => void
}

interface Props {
  item: TestItemWithStats
  color: string
  handlers: RowHandlers
}

function shortDate(d: string) {
  return format(parseISO(d), 'd MMM')
}

function TestRowImpl({ item, color, handlers }: Props) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [schedAnchor, setSchedAnchor] = useState<HTMLElement | null>(null)
  const soon = !item.is_available
  const attempted = item.attempt_count > 0

  return (
    <div
      className={`tq-row group relative flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 border-t border-border/40 first:border-t-0 transition-colors hover:bg-secondary/25 ${
        soon ? 'opacity-60' : ''
      }`}
    >
      {/* accent rail */}
      <span
        aria-hidden
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full transition-opacity"
        style={{ background: color, opacity: attempted ? 0.9 : 0.25 }}
      />

      {/* Title + meta */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start gap-2">
          <InlineEdit
            value={item.title}
            onSave={(title) => handlers.onRename(item, { title })}
            className="text-sm font-semibold text-foreground leading-snug break-words"
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pl-1.5">
          <span
            className="rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ color, borderColor: `${color}40`, background: `${color}14` }}
          >
            {SERIES_LABEL[item.series]}
          </span>
          {item.tier && (
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                item.tier === 'premium' ? 'bg-amber-400/15 text-amber-300' : 'bg-emerald-400/15 text-emerald-300'
              }`}
            >
              {TIER_LABEL[item.tier]}
            </span>
          )}
          {soon && (
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
              <Lock className="h-2.5 w-2.5" /> Coming soon
            </span>
          )}
          {item.next_scheduled_date && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/12 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              <CalendarCheck className="h-2.5 w-2.5" /> Planned {shortDate(item.next_scheduled_date)}
            </span>
          )}
          {item.notes && <span className="text-[11px] italic text-muted-foreground/80">{item.notes}</span>}
        </div>
        <InlineEdit
          value={item.topics ?? ''}
          onSave={(topics) => handlers.onRename(item, { topics })}
          placeholder="Add topics…"
          className="text-xs text-muted-foreground break-words"
          inputClassName="text-xs"
        />
      </div>

      {/* Attempts */}
      <div className="flex items-center justify-between gap-3 sm:justify-end sm:w-[250px] shrink-0">
        <div className="flex flex-col items-start sm:items-end gap-1 min-w-[84px]">
          {attempted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
              Attempted ×{item.attempt_count}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-muted-foreground/70">Not attempted</span>
          )}
          {item.last_attempted_at && (
            <span className="text-[10px] text-muted-foreground">Last: {format(parseISO(item.last_attempted_at), 'd MMM yyyy')}</span>
          )}
          {item.best_score != null && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-300/90">
              <Trophy className="h-2.5 w-2.5" />
              Best {item.best_score}
              {item.last_max_score != null && `/${item.last_max_score}`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-xl border border-border bg-secondary/50">
            <button
              aria-label={`Remove last attempt of ${item.title}`}
              disabled={soon || !attempted}
              onClick={() => handlers.onRemoveAttempt(item)}
              className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[1.6rem] text-center text-sm font-bold tabular-nums text-foreground">{item.attempt_count}</span>
            <button
              aria-label={`Log an attempt of ${item.title}`}
              title="Log attempt (Shift+click to add score & notes)"
              disabled={soon}
              onClick={(e) => (e.shiftKey ? handlers.onLogDetails(item) : handlers.onQuickAttempt(item))}
              className="p-1.5 text-primary hover:brightness-125 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            aria-label="Log attempt with score and notes"
            title="Log with score / notes"
            disabled={soon}
            onClick={() => handlers.onLogDetails(item)}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ClipboardPen className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 sm:w-[112px] sm:justify-end">
        <button
          aria-label={`Schedule ${item.title}`}
          disabled={soon}
          onClick={(e) => setSchedAnchor(schedAnchor ? null : e.currentTarget)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <CalendarPlus className="h-3.5 w-3.5 text-primary" />
          <span className="sm:hidden lg:inline">Plan</span>
        </button>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open link"
            className="rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <button
          aria-label="More actions"
          onClick={(e) => setMenuAnchor(menuAnchor ? null : e.currentTarget)}
          className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {menuAnchor && (
        <Popover anchor={menuAnchor} onClose={() => setMenuAnchor(null)} width={190} label="Actions">
          <MenuItem icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => { setMenuAnchor(null); handlers.onEdit(item) }}>Edit</MenuItem>
          <MenuItem icon={<History className="h-3.5 w-3.5" />} onClick={() => { setMenuAnchor(null); handlers.onHistory(item) }}>Attempt history</MenuItem>
          <MenuItem icon={<Trash2 className="h-3.5 w-3.5" />} danger onClick={() => { setMenuAnchor(null); handlers.onDelete(item) }}>Delete</MenuItem>
        </Popover>
      )}
      {schedAnchor && (
        <SchedulePopover
          anchor={schedAnchor}
          onClose={() => setSchedAnchor(null)}
          onPick={(d) => handlers.onSchedule(item, d)}
        />
      )}
    </div>
  )
}

export const TestRow = memo(TestRowImpl)
