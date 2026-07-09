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
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between bg-background/70 backdrop-blur-xl border-b border-border/40 px-6 md:px-8">
      {/* Page Breadcrumb / Title */}
      <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground/80">
        <span className="font-extrabold text-foreground hover:text-primary transition-all cursor-pointer">StudyOS</span>
        <span className="text-muted-foreground/30 font-light text-xs">/</span>
        <span className="font-semibold text-muted-foreground">Workspace</span>
      </div>

      {/* Center/Right Search Bar & Action items */}
      <div className="flex items-center gap-4">
        {/* Ctrl+K Search button */}
        <button
          onClick={onSearchClick}
          className="flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground bg-secondary/30 hover:bg-secondary/65 border border-border/60 rounded-input transition-all cursor-pointer w-44 md:w-60 h-9"
        >
          <Search className="h-4.5 w-4.5 text-muted-foreground/60 flex-shrink-0" />
          <span className="flex-1 text-left font-medium tracking-wide">Search...</span>
          <kbd className="hidden md:inline-flex h-5.5 select-none items-center gap-1 rounded-[6px] border border-border/80 bg-nested px-1.5 font-mono text-[9px] font-bold text-muted-foreground/75">
            ⌘K
          </kbd>
        </button>

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="h-9 w-9 rounded-button border border-border/60 bg-secondary/30 hover:bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-[#F5F5F5] transition-all cursor-pointer"
          title={`Switch Theme (Current: ${theme})`}
        >
          {theme === 'light' ? (
            <Sun className="h-5 w-5" />
          ) : theme === 'amoled' ? (
            <Sparkles className="h-5 w-5 text-primary" />
          ) : (
            <Moon className="h-5 w-5" />
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
                className="h-8 w-8 rounded-full border border-border/60 bg-muted"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                {profile.full_name ? profile.full_name.charAt(0) : 'U'}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
