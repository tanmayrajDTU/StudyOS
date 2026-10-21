'use client'

import React, { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Clock, Plus, Trash2, Trophy } from 'lucide-react'
import { Modal, toast, errMsg } from './ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { AttemptFormModal } from './AttemptFormModal'
import { useAttempts, useDeleteAttempt } from '@/hooks/useTests'
import './tests.css'

interface Props {
  item: { id: string; title: string } | null
  onClose: () => void
}

export function AttemptHistoryDrawer({ item, onClose }: Props) {
  const { data: attempts = [], isLoading } = useAttempts(item?.id ?? null, !!item)
  const del = useDeleteAttempt()
  const [logging, setLogging] = useState(false)

  return (
    <>
      <Modal
        open={!!item}
        onClose={onClose}
        side="right"
        title="Attempt history"
        description={item?.title}
        footer={
          <button onClick={() => setLogging(true)} className="btn-primary">
            <Plus className="h-3.5 w-3.5" /> Log attempt
          </button>
        }
      >
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No attempts yet.</p>
        ) : (
          <ol className="space-y-2.5">
            {attempts.map((a, i) => (
              <li key={a.id} className="group rounded-xl border border-border/60 bg-secondary/30 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-md bg-primary/15 text-primary font-bold px-1.5 py-0.5">
                        #{attempts.length - i}
                      </span>
                      <span className="text-foreground font-medium">{format(parseISO(a.attempted_at), 'd MMM yyyy, h:mm a')}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {a.score != null && (
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <Trophy className="h-3 w-3" />
                          {a.score}
                          {a.max_score != null && <span className="text-muted-foreground font-normal">/ {a.max_score}</span>}
                        </span>
                      )}
                      {a.duration_min != null && (
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.duration_min} min</span>
                      )}
                    </div>
                    {a.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{a.notes}</p>}
                  </div>
                  <button
                    aria-label="Delete attempt"
                    onClick={() =>
                      del.mutate(
                        { id: a.id, itemId: a.item_id },
                        { onSuccess: () => toast.info('Attempt deleted'), onError: (e) => toast.error(errMsg(e)) },
                      )
                    }
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 cursor-pointer opacity-60 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Modal>
      {item && <AttemptFormModal open={logging} onClose={() => setLogging(false)} itemId={item.id} itemTitle={item.title} />}
    </>
  )
}
