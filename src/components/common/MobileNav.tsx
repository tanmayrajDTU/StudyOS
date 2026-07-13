'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  RotateCw,
  Settings,
  BookOpen,
  Target
} from 'lucide-react'

export default function MobileNav() {
  const pathname = usePathname()

  const tabs = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Subjects', icon: BookOpen, path: '/subjects' },
    { name: 'PYQs', icon: Target, path: '/pyqs' },
    { name: 'Roadmap', icon: Calendar, path: '/roadmap' },
    { name: 'Revision', icon: RotateCw, path: '/revision' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50 px-2 pb-safe">
      {tabs.map((tab) => {
        const Icon = tab.icon
        // Match active path: exact match for root, prefix match for others to keep active state when nested
        const isActive = tab.path === '/' 
          ? pathname === '/' 
          : pathname === tab.path || pathname.startsWith(tab.path + '/')

        return (
          <Link
            key={tab.name}
            href={tab.path}
            className={`flex flex-col items-center justify-center gap-1 flex-1 min-w-0 h-12 transition-all ${
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="text-4xs font-semibold tracking-tight truncate w-full text-center">{tab.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
