'use client'

import React from 'react'
import { Sun, Moon, Sparkles, Search } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import Image from 'next/image'

interface TopBarProps {
  profile: {
    full_name?: string
    email?: string
    avatar_url?: string
  } | null
  onSearchClick: () => void
}

export default function TopBar({ profile, onSearchClick }: TopBarProps) {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('amoled')
    } else if (theme === 'amoled') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between bg-background/80 backdrop-blur-md border-b border-border px-4 md:px-6">
      {/* Page Breadcrumb / Title */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground tracking-tight">StudyOS</span>
        <span className="text-muted-foreground text-xs">/</span>
        <span className="text-muted-foreground text-xs">Workspace</span>
      </div>

      {/* Center/Right Search Bar & Action items */}
      <div className="flex items-center gap-4">
        {/* Ctrl+K Search button */}
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-card hover:bg-secondary border border-border rounded-lg transition-all cursor-pointer w-40 md:w-56"
        >
          <Search className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-3xs font-medium">
            Ctrl K
          </kbd>
        </button>

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="h-9 w-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          title={`Switch Theme (Current: ${theme})`}
        >
          {theme === 'light' ? (
            <Sun className="h-4 w-4" />
          ) : theme === 'amoled' ? (
            <Sparkles className="h-4 w-4 text-primary" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* User Profile Avatar (visible on mobile only since desktop has it in sidebar) */}
        {profile && (
          <div className="md:hidden flex items-center">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name || 'User'}
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 rounded-full border border-border bg-muted"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                {profile.full_name ? profile.full_name.charAt(0) : 'U'}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
