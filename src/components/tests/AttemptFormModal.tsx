'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import { Modal, Field, toast, errMsg } from './ui'
import { useLogAttempt } from '@/hooks/useTests'
import './tests.css'

interface Props {
  open: boolean
  onClose: () => void
  itemId: string
  itemTitle: string
}

const nowLocal = () => format(new Date(), "yyyy-MM-dd'T'HH:mm")

/** Log an attempt with optional score, duration, date and notes. */
export function AttemptFormModal({ open, onClose, itemId, itemTitle }: Props) {
  const log = useLogAttempt()
  const [score, setScore] = useState('')
  const [maxScore, setMaxScore] = useState('')
  const [duration, setDuration] = useState('')
  const [when, setWhen] = useState(nowLocal)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | undefined>()

  const reset = () => {
    setScore('')
    setMaxScore('')
    setDuration('')
    setWhen(nowLocal())
    setNotes('')
    setError(undefined)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const s = score === '' ? null : Number(score)
    const m = maxScore === '' ? null : Number(maxScore)
    if ((s !== null && Number.isNaN(s)) || (m !== null && Number.isNaN(m))) return setError('Scores must be numbers')
    if (s !== null && m !== null && s > m) return setError('Score cannot exceed max score')
    if (m !== null && m <= 0) return setError('Max score must be positive')
    try {
      await log.mutateAsync({
        itemId,
        attemptedAt: when ? new Date(when).toISOString() : undefined,
        score: s,
        maxScore: m,
        durationMin: duration === '' ? null : Math.round(Number(duration)),
        notes: notes.trim() || null,
      })
      toast.success('Attempt logged')
      reset()
      onClose()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log attempt"
      description={itemTitle}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" form="attempt-form" disabled={log.isPending} className="btn-primary">
            {log.isPending ? 'Saving…' : 'Log attempt'}
          </button>
        </>
      }
    >
      <form id="attempt-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Score (optional)">
            <input type="number" step="any" inputMode="decimal" value={score} onChange={(e) => setScore(e.target.value)} className="field-input" placeholder="e.g. 42.5" />
          </Field>
          <Field label="Out of (optional)">
            <input type="number" step="any" inputMode="decimal" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className="field-input" placeholder="e.g. 65" />
          </Field>
          <Field label="Duration (min)">
            <input type="number" min={0} inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} className="field-input" placeholder="e.g. 180" />
          </Field>
          <Field label="When">
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="field-input" />
          </Field>
        </div>
        <Field label="Notes (optional)" error={error}>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="field-input resize-none" placeholder="Weak areas, silly mistakes, what to revise…" />
        </Field>
      </form>
    </Modal>
  )
}
