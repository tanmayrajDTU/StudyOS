'use client'

import React, { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar/Sidebar'
import TopBar from '@/components/common/TopBar'
import MobileNav from '@/components/common/MobileNav'
import SearchDialog from '@/components/common/SearchDialog'

interface SidebarWrapperProps {
  initialProfile: {
    full_name?: string
    email?: string
    avatar_url?: string
    daily_target_hours?: number
  } | null
  children: React.ReactNode
}

export default function SidebarWrapper({ initialProfile, children }: SidebarWrapperProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Trigger search dialog on Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-transparent relative z-1">
      {/* Collapsible desktop sidebar */}
      <Sidebar profile={initialProfile} />

      {/* Main panel */}
      <div className="flex flex-1 flex-col h-full overflow-hidden">
        {/* Top Header */}
        <TopBar
          profile={initialProfile}
          onSearchClick={() => setIsSearchOpen(true)}
        />

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6 focus:outline-none">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation bar */}
      <MobileNav />

      {/* Ctrl+K Search Overlay */}
      <SearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  )
}
