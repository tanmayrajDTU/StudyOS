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
  BookOpen,
  Target
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
    { name: 'PYQ Practice', icon: Target, path: '/pyqs' },
    { name: 'Roadmap', icon: Calendar, path: '/roadmap' },
    { name: 'Revision', icon: RotateCw, path: '/revision' },
    { name: 'Analytics', icon: BarChart2, path: '/analytics' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ]

  return (
    <aside
      className={`hidden md:flex flex-col h-screen bg-sidebar border-r border-border transition-all duration-300 relative ${
        isCollapsed ? 'w-18' : 'w-66'
      }`}
    >
      {/* Sidebar Logo */}
      <div className="flex h-15 items-center justify-between px-5 border-b border-border/40">
        <Link href="/" className="flex items-center gap-2.5 font-extrabold text-[#F5F5F5]">
          <div className="flex h-8.5 w-8.5 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-[0_0_15px_rgba(217,255,63,0.15)] transition-all">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          {!isCollapsed && <span className="tracking-tight text-sm font-bold font-mono">StudyOS</span>}
        </Link>
 
        {/* Collapse Button */}
        <button
          onClick={toggleCollapse}
          className="absolute -right-3 top-4.5 h-6 w-6 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-[#F5F5F5] hover:bg-secondary cursor-pointer shadow-xs z-50 transition-all"
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </div>
 
      {/* Menu Links */}
      <nav className="flex-1 space-y-1 p-3.5">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.path
 
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex items-center gap-3.5 rounded-button px-4 py-2.5 text-[13px] font-semibold transition-all relative ${
                isActive
                  ? 'bg-secondary/80 text-[#F5F5F5] border border-border/80 shadow-[0_0_12px_rgba(217,255,63,0.02)]'
                  : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground border border-transparent'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.name : undefined}
            >
              {/* Left active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-md" />
              )}
              <Icon className="h-[18px] w-[18px] flex-shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>
 
      {/* Sidebar stats card (visible only when expanded) */}
      {!isCollapsed && stats && (
        <div className="mx-4 my-2.5 p-4 rounded-card bg-secondary/20 border border-border/50 space-y-3">
          <p className="text-3xs font-black uppercase text-muted-foreground tracking-widest font-mono">
            Overall Progress
          </p>
 
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-foreground">
              <span>{Math.round(stats.totalCompleted)}h / {Math.round(stats.totalEstimated)}h</span>
              <span className="text-primary">{stats.totalEstimated > 0 ? Math.round((stats.totalCompleted / stats.totalEstimated) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-[#111216] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${stats.totalEstimated > 0 ? Math.min((stats.totalCompleted / stats.totalEstimated) * 100, 100) : 0}%` }}
              />
            </div>
          </div>
 
          <div className="grid grid-cols-2 gap-2 text-3xs font-mono border-t border-border/30 pt-2.5">
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
      <div className="p-3.5 border-t border-border/40 space-y-2">
        {!isCollapsed && profile && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-card bg-secondary/15 border border-border/30">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name || 'User'}
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 rounded-full border border-border/60 bg-muted flex-shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0 border border-primary/20">
                {profile.full_name ? profile.full_name.charAt(0) : 'U'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#F5F5F5] truncate">
                {profile.full_name || 'Tanmay Raj'}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono truncate">
                {profile.email || 'tanmayraj1705@gmail.com'}
              </p>
            </div>
          </div>
        )}
 
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={`w-full flex items-center gap-3.5 rounded-button px-4 py-2.5 text-[13px] font-semibold text-destructive hover:bg-destructive/10 transition-all cursor-pointer ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Log Out' : undefined}
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
          {!isCollapsed && <span>{loggingOut ? 'Logging out...' : 'Log Out'}</span>}
        </button>
      </div>
    </aside>
  )
}
