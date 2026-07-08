import React from 'react'
import { Sparkles } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-xl bg-card/20 min-h-[300px]">
      <div className="h-10 w-10 text-muted-foreground flex items-center justify-center mb-4">
        {icon || <Sparkles className="h-6 w-6 text-primary" />}
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="rounded-lg bg-foreground text-background font-medium px-4 py-2 hover:opacity-90 active:scale-95 transition-all text-sm cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
