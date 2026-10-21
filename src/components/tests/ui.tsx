'use client'

import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Toasts (tiny external store, no extra dependency)                   */
/* ------------------------------------------------------------------ */

export type ToastTone = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  message: string
  tone: ToastTone
  action?: { label: string; onClick: () => void }
}

let toasts: ToastItem[] = []
let nextToastId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export const toast = {
  show(message: string, tone: ToastTone = 'info', action?: ToastItem['action']) {
    const id = nextToastId++
    toasts = [...toasts.slice(-3), { id, message, tone, action }]
    emit()
    setTimeout(() => dismissToast(id), action ? 6500 : 4000)
  },
  success: (m: string, action?: ToastItem['action']) => toast.show(m, 'success', action),
  error: (m: string) => toast.show(m, 'error'),
  info: (m: string) => toast.show(m, 'info'),
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function ToastHost() {
  const list = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => toasts,
  )
  const icon = { success: CheckCircle2, error: XCircle, info: Info }
  const color = { success: 'text-emerald-400', error: 'text-red-400', info: 'text-primary' }
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 w-[min(92vw,360px)]" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => {
          const Icon = icon[t.tone]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              className="flex items-start gap-2.5 rounded-xl border border-border bg-popover/95 backdrop-blur px-3.5 py-3 shadow-xl text-sm"
            >
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color[t.tone]}`} />
              <span className="flex-1 text-foreground">{t.message}</span>
              {t.action && (
                <button
                  onClick={() => {
                    t.action?.onClick()
                    dismissToast(t.id)
                  }}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  {t.action.label}
                </button>
              )}
              <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong'
}

/* ------------------------------------------------------------------ */
/* Popover (portal + fixed positioning, flips near viewport edges)     */
/* ------------------------------------------------------------------ */

interface PopoverProps {
  anchor: HTMLElement | null
  onClose: () => void
  width?: number
  align?: 'left' | 'right'
  children: React.ReactNode
  label?: string
}

export function Popover({ anchor, onClose, width = 240, align = 'right', children, label }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return
    const r = anchor.getBoundingClientRect()
    const h = ref.current.offsetHeight
    let left = align === 'right' ? r.right - width : r.left
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
    let top = r.bottom + 6
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6)
    setPos((p) => (p && p.top === top && p.left === left ? p : { top, left }))
  }, [anchor, width, align, children])

  useEffect(() => {
    if (!anchor) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || anchor.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onScroll = (e: Event) => {
      if (ref.current?.contains(e.target as Node)) return
      onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onClose)
    }
  }, [anchor, onClose])

  if (!anchor || typeof document === 'undefined') return null
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width, zIndex: 80 }}
      className="rounded-xl border border-border bg-popover shadow-2xl shadow-black/50 p-1.5 animate-in fade-in"
    >
      {children}
    </div>,
    document.body,
  )
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium cursor-pointer transition-colors ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-foreground hover:bg-secondary'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Modal / Drawer                                                      */
/* ------------------------------------------------------------------ */

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  side?: 'center' | 'right'
  footer?: React.ReactNode
}

export function Modal({ open, onClose, title, description, children, side = 'center', footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button[data-autofocus]')
      first?.focus()
    }, 60)
    return () => {
      document.removeEventListener('keydown', onKey)
      clearTimeout(t)
      prev?.focus?.()
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null
  const isDrawer = side === 'right'

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90]">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className={`absolute inset-0 flex pointer-events-none ${isDrawer ? 'justify-end' : 'items-center justify-center p-4'}`}>
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              initial={isDrawer ? { x: '100%' } : { opacity: 0, scale: 0.96, y: 12 }}
              animate={isDrawer ? { x: 0 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isDrawer ? { x: '100%' } : { opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', damping: 30, stiffness: 340 }}
              className={`pointer-events-auto flex flex-col bg-popover border border-border shadow-2xl shadow-black/60 ${
                isDrawer
                  ? 'h-full w-full max-w-md border-y-0 border-r-0'
                  : 'w-full max-w-lg max-h-[90vh] rounded-2xl'
              }`}
            >
              <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-foreground truncate">{title}</h2>
                  {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
              {footer && <div className="border-t border-border/60 px-5 py-3.5 flex justify-end gap-2">{footer}</div>}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onClose,
  busy,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
  busy?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={onConfirm} disabled={busy} data-autofocus className="btn-danger">
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3 text-sm text-muted-foreground">
        <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
        <p>{message}</p>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
      {hint && !error && <span className="block text-[11px] text-muted-foreground/70">{hint}</span>}
      {error && <span className="block text-[11px] text-red-400">{error}</span>}
    </label>
  )
}
