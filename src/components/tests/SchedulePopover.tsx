'use client'

import React, { useState } from 'react'
import { addDays, format } from 'date-fns'
import { CalendarPlus, CalendarClock, Sun, Sunrise } from 'lucide-react'
import { Popover, MenuItem } from './ui'
import './tests.css'

interface Props {
  anchor: HTMLElement | null
  onClose: () => void
  /** Called with a local 'yyyy-MM-dd' date. */
  onPick: (date: string) => void
  title?: string
}

/** Today / Tomorrow / pick-a-date popover. Reused by the library and the Day Plan page. */
export function SchedulePopover({ anchor, onClose, onPick, title = 'Schedule for' }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [custom, setCustom] = useState(format(addDays(new Date(), 2), 'yyyy-MM-dd'))

  const pick = (d: string) => {
    onPick(d)
    onClose()
  }

  return (
    <Popover anchor={anchor} onClose={onClose} width={252} label={title}>
      <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      <MenuItem icon={<Sun className="h-3.5 w-3.5 text-amber-400" />} onClick={() => pick(today)}>
        Today
      </MenuItem>
      <MenuItem icon={<Sunrise className="h-3.5 w-3.5 text-sky-400" />} onClick={() => pick(format(addDays(new Date(), 1), 'yyyy-MM-dd'))}>
        Tomorrow
      </MenuItem>
      <div className="mt-1 border-t border-border/60 p-2 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" /> Pick a date
        </div>
        <input
          type="date"
          value={custom}
          min={today}
          onChange={(e) => setCustom(e.target.value)}
          className="field-input"
          aria-label="Pick a date"
        />
        <button onClick={() => custom && pick(custom)} disabled={!custom} className="btn-primary w-full">
          <CalendarPlus className="h-3.5 w-3.5" /> Add to plan
        </button>
      </div>
    </Popover>
  )
}
