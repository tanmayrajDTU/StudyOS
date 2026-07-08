import React from 'react'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-muted/40 ${className}`} />
  )
}
