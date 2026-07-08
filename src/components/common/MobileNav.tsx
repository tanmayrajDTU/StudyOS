'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  RotateCw,
  Settings,
  BookOpen
} from 'lucide-react'

export default function MobileNav() {
  const pathname = usePathname()

  const tabs = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Subjects', icon: BookOpen, path: '/subjects' },
    { name: 'Roadmap', icon: Calendar, path: '/roadmap' },
    { name: 'Revision', icon: RotateCw, path: '/revision' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50 px-2 pb-safe">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = pathname === tab.path

        return (
          <Link
            key={tab.name}
            href={tab.path}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-12 transition-all ${
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-4xs font-medium tracking-tight">{tab.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
