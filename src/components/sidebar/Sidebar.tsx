'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  RotateCw,
  BarChart2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen
} from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { getAppStats } from '@/actions/db'

interface SidebarProps {
  profile: {
    full_name?: string
    email?: string
    avatar_url?: string
    daily_target_hours?: number
  } | null
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const { data: stats = null } = useQuery({
    queryKey: ['app-stats'],
    queryFn: () => getAppStats(),
  })

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('studyos-sidebar-collapsed')
    if (saved) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  const toggleCollapse = () => {
    const newVal = !isCollapsed
    setIsCollapsed(newVal)
    localStorage.setItem('studyos-sidebar-collapsed', String(newVal))
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.refresh()
      router.push('/login')
    } catch (err) {
      console.error('Logout failed:', err)
      setLoggingOut(false)
    }
  }

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Subjects', icon: BookOpen, path: '/subjects' },
    { name: 'Roadmap', icon: Calendar, path: '/roadmap' },
    { name: 'Revision', icon: RotateCw, path: '/revision' },
    { name: 'Analytics', icon: BarChart2, path: '/analytics' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ]

  return (
    <aside
      className={`hidden md:flex flex-col h-screen bg-card border-r border-border transition-all duration-300 relative ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Sidebar Logo */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          {!isCollapsed && <span className="tracking-tight text-sm">StudyOS</span>}
        </Link>

        {/* Collapse Button */}
        <button
          onClick={toggleCollapse}
          className="absolute -right-3 top-4 h-6 w-6 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer shadow-sm z-50"
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </div>

      {/* Menu Links */}
      <nav className="flex-1 space-y-1 p-3">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.path

          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar stats card (visible only when expanded) */}
      {!isCollapsed && stats && (
        <div className="mx-3 my-2 p-3.5 rounded-xl bg-secondary/35 border border-border/40 space-y-2.5">
          <p className="text-3xs font-extrabold uppercase text-muted-foreground tracking-widest">
            Overall Progress
          </p>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-foreground">
              <span>{Math.round(stats.totalCompleted)}h / {Math.round(stats.totalEstimated)}h</span>
              <span className="text-primary">{stats.totalEstimated > 0 ? Math.round((stats.totalCompleted / stats.totalEstimated) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${stats.totalEstimated > 0 ? Math.min((stats.totalCompleted / stats.totalEstimated) * 100, 100) : 0}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-3xs font-mono border-t border-border/30 pt-2">
            <div>
              <p className="text-muted-foreground">Lectures</p>
              <p className="font-bold text-foreground">{stats.completedLectures} / {stats.totalLectures}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Est. Days Left</p>
              <p className="font-bold text-foreground text-primary">
                {Math.ceil(Math.max(stats.totalEstimated - stats.totalCompleted, 0) / (profile?.daily_target_hours || 4.0))}d
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User profile / Logout */}
      <div className="p-3 border-t border-border space-y-2">
        {!isCollapsed && profile && (
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-secondary/50 border border-border/20">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name || 'User'}
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 rounded-full border border-border bg-muted flex-shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                {profile.full_name ? profile.full_name.charAt(0) : 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">
                {profile.full_name || 'Tanmay Raj'}
              </p>
              <p className="text-3xs text-muted-foreground truncate">
                {profile.email || 'tanmayraj1705@gmail.com'}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all cursor-pointer ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Log Out' : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span>{loggingOut ? 'Logging out...' : 'Log Out'}</span>}
        </button>
      </div>
    </aside>
  )
}
