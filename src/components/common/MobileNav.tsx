'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  RotateCw,
  Settings,
  BookOpen,
  NotebookText,
  FlaskConical,
  CalendarCheck,
  Ellipsis
} from 'lucide-react'

export default function MobileNav() {
  const pathname = usePathname()
  // The "More" sheet is open only for the page it was opened on, so navigating closes it.
  const [openAt, setOpenAt] = useState<string | null>(null)
  const moreOpen = openAt === pathname

  const tabs = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Subjects', icon: BookOpen, path: '/subjects' },
    { name: 'Roadmap', icon: Calendar, path: '/roadmap' },
    { name: 'Revision', icon: RotateCw, path: '/revision' },
    { name: 'Tests', icon: FlaskConical, path: '/tests', exclude: '/tests/plan' },
  ]

  const moreLinks = [
    { name: 'Day Plan', icon: CalendarCheck, path: '/tests/plan' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ]

  const matches = (path: string, exclude?: string) =>
    (path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(path + '/')) &&
    !(exclude && (pathname === exclude || pathname.startsWith(exclude + '/')))

  const moreActive = moreOpen || moreLinks.some((l) => matches(l.path))

  useEffect(() => {
    if (!moreOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenAt(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [moreOpen])

  const tabClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-1 flex-1 min-w-0 h-12 transition-all ${
      active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
    }`

  return (
    <>
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setOpenAt(null)}>
          <div className="absolute inset-0 bg-black/50" aria-hidden />
          <div
            id="mobile-more-sheet"
            role="menu"
            aria-label="More pages"
            onClick={(e) => e.stopPropagation()}
            className="absolute left-3 right-3 bottom-[4.5rem] rounded-2xl border border-border bg-popover p-2 shadow-2xl"
          >
            {moreLinks.map((l) => {
              const Icon = l.icon
              return (
                <Link
                  key={l.name}
                  href={l.path}
                  role="menuitem"
                  aria-current={matches(l.path) ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold ${
                    matches(l.path) ? 'bg-secondary text-primary' : 'text-foreground hover:bg-secondary/60'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {l.name}
                </Link>
              )
            })}
            <a
              href="/notes/index.html"
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-foreground hover:bg-secondary/60"
            >
              <NotebookText className="h-5 w-5" />
              Notes
            </a>
          </div>
        </div>
      )}
      <nav aria-label="Primary" className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50 px-2 pb-safe">
        {tabs.map((tab) => {
          const Icon = tab.icon
          // Exact match for root, prefix match for others to keep active state when nested
          const isActive = matches(tab.path, tab.exclude)

          return (
            <Link
              key={tab.name}
              href={tab.path}
              aria-current={isActive ? 'page' : undefined}
              className={tabClass(isActive)}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="text-4xs font-semibold tracking-tight truncate w-full text-center">{tab.name}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setOpenAt(moreOpen ? null : pathname)}
          aria-expanded={moreOpen}
          aria-controls="mobile-more-sheet"
          aria-label="More pages"
          className={`${tabClass(moreActive)} cursor-pointer`}
        >
          <Ellipsis className="h-5 w-5 flex-shrink-0" />
          <span className="text-4xs font-semibold tracking-tight truncate w-full text-center">More</span>
        </button>
      </nav>
    </>
  )
}
