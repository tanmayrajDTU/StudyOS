'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSubjects, getAppStats, getProfile } from '@/actions/db'
import { getTodayRoadmap, getRoadmapDetails } from '@/actions/roadmap'
import {
  Sparkles,
  Clock,
  BookOpen,
  Calendar,
  ChevronRight,
  TrendingUp,
  Award,
  Loader2,
  CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import { getSubjectIcon } from '@/components/subjects/SortableSubjectCard'
import { format, parseISO } from 'date-fns'
import CountdownTimer from '@/components/dashboard/CountdownTimer'
import { useBatchToggle } from '@/hooks/useBatchToggle'

interface Subject {
  id: string
  name: string
  icon: string
  color: string
  estimated_hours: number
  completed_hours: number
}

interface RoadmapItem {
  id: string
  roadmap_id: string
  lecture_id: string
  scheduled_date: string
  study_order: number
  completed_hours: number
  lectures: {
    id: string
    title: string
    estimated_hours: number
    completed_hours: number
    modules: {
      id: string
      name: string
      subjects: {
        id: string
        name: string
        color: string
      } | null
    } | null
  } | null
}

export default function DashboardPage() {
  // 1. Fetch user data & stats
  const { data: profile = null } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(),
  })

  const { data: subjects = [], isLoading: loadingSubs } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => getSubjects(),
  })

  const { data: stats = null, isLoading: loadingStats } = useQuery({
    queryKey: ['app-stats'],
    queryFn: () => getAppStats(),
  })

  // 2. Fetch active roadmap status & today's schedule
  const { data: roadmapDetails = null } = useQuery({
    queryKey: ['roadmap-status'],
    queryFn: () => getRoadmapDetails(),
  })

  const { data: todayLecturesData = [], isLoading: loadingToday } = useQuery({
    queryKey: ['today-roadmap'],
    queryFn: () => getTodayRoadmap(),
  })

  const todayLectures = todayLecturesData as unknown as RoadmapItem[]

  const { toggleLecture, syncing, syncError, retry } = useBatchToggle()

  const isLoading = loadingSubs || loadingStats || loadingToday

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Derived progress calculations
  const totalHours = stats?.totalEstimated || 0
  const completedHours = stats?.totalCompleted || 0
  const progressPercent = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0
  
  const dailyTarget = profile?.daily_target_hours || 4.0
  const hoursLeft = Math.max(totalHours - completedHours, 0)
  const daysLeft = Math.ceil(hoursLeft / dailyTarget)

  // Circular Dial SVG dimensions
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#F5F5F5] font-mono leading-none flex items-center gap-2">
            Welcome back, {profile?.full_name || 'Tanmay Raj'} 
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          </h1>
          <p className="text-xs font-medium text-muted-foreground tracking-wide">
            Here is your study roadmap status for today. Keep pushing!
          </p>
        </div>
        
        <div className="text-right sm:text-right flex-shrink-0">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider font-mono bg-secondary/35 border border-border/50 px-3.5 py-1.5 rounded-lg shadow-2xs">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* GATE Countdown Timer */}
      <CountdownTimer />

      {/* 2. Overall Progress Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-card border border-border/40 bg-gradient-to-br from-[#111216]/95 to-[#16181D]/95 backdrop-blur-md p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-4 flex-1 w-full">
            <h3 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest font-mono">
              Syllabus Study Progress
            </h3>
            <div className="space-y-1.5">
              <p className="text-3xl font-extrabold text-[#F5F5F5] tracking-tight">
                {completedHours.toFixed(1)} <span className="text-xs text-muted-foreground font-medium tracking-wide">hours studied</span>
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                Out of {totalHours.toFixed(1)} total estimated syllabus hours.
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-t border-border/20 pt-4 text-xs font-mono">
              <div>
                <p className="text-muted-foreground text-3xs font-bold uppercase tracking-wider">Lectures</p>
                <p className="font-bold text-foreground text-sm">{stats?.completedLectures} / {stats?.totalLectures}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-3xs font-bold uppercase tracking-wider">Daily Target</p>
                <p className="font-bold text-foreground text-sm">{dailyTarget}h</p>
              </div>
              <div>
                <p className="text-muted-foreground text-3xs font-bold uppercase tracking-wider">Target Finish</p>
                <p className="font-bold text-foreground text-sm">{daysLeft}d left</p>
              </div>
            </div>
          </div>

          {/* Premium Progress Ring Dial */}
          <div className="relative flex items-center justify-center flex-shrink-0 w-36 h-36">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-[#16181d] fill-none"
                strokeWidth="8"
              />
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-primary fill-none transition-all duration-500 ease-out"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 6px rgba(217, 255, 63, 0.15))' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center space-y-0.5">
              <span className="text-2xl font-black text-foreground tracking-tight">{progressPercent}%</span>
              <span className="text-4xs text-muted-foreground uppercase font-mono font-black tracking-widest">Complete</span>
            </div>
          </div>
        </div>

        {/* Stats Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
          <div className="rounded-card border border-border/40 bg-card p-5.5 shadow-xs flex items-center gap-4.5 hover:border-border/80 transition-all duration-200">
            <div className="h-10.5 w-10.5 rounded-xl bg-primary/10 text-primary border border-primary/25 flex items-center justify-center">
              <Clock className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-3xs font-bold uppercase text-muted-foreground tracking-wider font-mono">Hours Left</p>
              <p className="text-xl font-extrabold text-[#F5F5F5]">{hoursLeft.toFixed(1)} hrs</p>
            </div>
          </div>

          <div className="rounded-card border border-border/40 bg-card p-5.5 shadow-xs flex items-center gap-4.5 hover:border-border/80 transition-all duration-200">
            <div className="h-10.5 w-10.5 rounded-xl bg-primary/10 text-primary border border-primary/25 flex items-center justify-center">
              <Calendar className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-3xs font-bold uppercase text-muted-foreground tracking-wider font-mono">Estimated Days</p>
              <p className="text-xl font-extrabold text-[#F5F5F5]">{daysLeft} days remaining</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Today's Plan */}
      <div className="rounded-card border border-border/40 bg-card p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2 font-mono">
              <Award className="h-4.5 w-4.5 text-primary" />
              Today&apos;s Plan
            </h3>
            {syncing && <span className="text-4xs text-muted-foreground animate-pulse ml-2 font-mono">Saving...</span>}
            {syncError && (
              <span className="text-4xs text-red-500 font-semibold flex items-center gap-1.5 ml-2 font-mono">
                {syncError}
                <button onClick={retry} className="text-primary hover:underline font-bold cursor-pointer">
                  Retry
                </button>
              </span>
            )}
          </div>
          <Link href="/roadmap" className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
            <span>View Calendar</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {todayLectures.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border/50 rounded-module bg-secondary/5 space-y-1">
            <p className="text-xs text-[#F5F5F5] font-semibold mb-1">No lectures scheduled for today.</p>
            <p className="text-3xs text-muted-foreground max-w-xs mx-auto mb-4 leading-normal">Configure target finish dates in the Roadmap tab to auto-generate your daily plan.</p>
            <Link
              href="/roadmap"
              className="inline-flex items-center justify-center bg-primary hover:opacity-90 text-primary-foreground text-2xs font-extrabold rounded-button px-4 py-2.5 transition-all shadow-xs"
            >
              Go to Roadmap
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/30 border border-border/40 rounded-xl overflow-hidden bg-secondary/5">
            {todayLectures.map((item: RoadmapItem) => {
              const lec = item.lectures
              if (!lec) return null
              const mod = lec.modules
              const sub = mod?.subjects

              const isCompleted = Number(lec.completed_hours) >= Number(lec.estimated_hours)

              return (
                <div 
                  key={item.id} 
                  className="p-5 hover:bg-secondary/15 transition-colors"
                  style={{ borderLeft: `3px solid ${sub?.color || '#818CF8'}` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <button
                        onClick={() => toggleLecture(lec.id, !isCompleted, Number(lec.estimated_hours), isCompleted)}
                        className={`h-5.5 w-5.5 rounded-full border flex items-center justify-center cursor-pointer transition-all hover:scale-105 flex-shrink-0 mt-0.5 ${
                          isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow shadow-emerald-500/20'
                            : 'border-border/80 text-transparent hover:border-primary hover:bg-secondary/40 font-semibold'
                        }`}
                      >
                        {isCompleted && <CheckCircle2 className="h-4 w-4 fill-current text-background" />}
                      </button>

                      <div className="space-y-1.5">
                        <h5 className={`text-[14px] font-semibold text-[#F5F5F5] leading-snug ${isCompleted ? 'line-through text-muted-foreground/60 font-medium' : ''}`}>
                          {lec.title}
                        </h5>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {sub && (
                            <span
                              className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-md border"
                              style={{ 
                                backgroundColor: `${sub.color}15`, 
                                borderColor: `${sub.color}35`, 
                                color: sub.color 
                              }}
                            >
                              {sub.name}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            Module: {mod?.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-[10px] font-mono font-bold">
                      <p className="text-muted-foreground uppercase tracking-wider text-4xs">Completed Time</p>
                      <p className="text-[#F5F5F5] mt-0.5 text-xs">
                        {Number(lec.completed_hours).toFixed(1)} / {Number(lec.estimated_hours).toFixed(1)}h
                      </p>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 4. Current Roadmap Status */}
      <div className="rounded-card border border-border/40 bg-card p-6 shadow-xs space-y-5">
        <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2 font-mono">
          <TrendingUp className="h-4.5 w-4.5 text-primary" />
          Current Roadmap Status
        </h3>
        
        {roadmapDetails ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="rounded-button border border-border/40 p-4.5 bg-secondary/15 flex items-center justify-between">
              <span className="text-muted-foreground">Roadmap Period</span>
              <span className="font-bold text-[#F5F5F5]">
                {format(parseISO(roadmapDetails.roadmap.start_date), 'MMM d')} - {roadmapDetails.roadmap.target_finish_date ? format(parseISO(roadmapDetails.roadmap.target_finish_date), 'MMM d, yyyy') : 'N/A'}
              </span>
            </div>
            <div className="rounded-button border border-border/40 p-4.5 bg-secondary/15 flex items-center justify-between">
              <span className="text-muted-foreground">Projected Finish Date</span>
              <span className="font-bold text-primary shadow-xs">
                {roadmapDetails.roadmap.target_finish_date ? format(parseISO(roadmapDetails.roadmap.target_finish_date), 'eeee, MMM d, yyyy') : 'Configure'}
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="rounded-button border border-border/40 p-4.5 bg-secondary/15 flex items-center justify-between">
              <span className="text-muted-foreground">Study Target Efficiency</span>
              <span className="font-bold text-[#F5F5F5]">Not Started</span>
            </div>
            <div className="rounded-button border border-border/40 p-4.5 bg-secondary/15 flex items-center justify-between">
              <span className="text-muted-foreground">Projected Finish Date</span>
              <span className="font-bold text-[#F5F5F5]">Configure Roadmap</span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Subject Overview */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2 font-mono">
            <BookOpen className="h-4.5 w-4.5 text-primary" />
            Subject Overview
          </h3>
          <Link href="/subjects" className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
            <span>Manage Courses</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border/50 rounded-module bg-secondary/5">
            <p className="text-xs text-muted-foreground font-mono italic">No subjects found. Open settings or let auto-seeding finish.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((sub: Subject) => {
              const subHrs = Number(sub.estimated_hours) || 0
              const subComp = Number(sub.completed_hours) || 0
              const pct = subHrs > 0 ? Math.round((subComp / subHrs) * 100) : 0

              return (
                <div
                  key={sub.id}
                  className="rounded-card border border-border/40 bg-card p-5.5 hover:-translate-y-[2px] hover:shadow-xs hover:border-border/80 transition-all duration-300 flex flex-col justify-between min-h-[145px]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center border shadow-xs flex-shrink-0"
                      style={{ 
                        backgroundColor: `${sub.color}15`, 
                        borderColor: `${sub.color}35`,
                        color: sub.color 
                      }}
                    >
                      {getSubjectIcon(sub.icon, 'h-4.5 w-4.5')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#F5F5F5] truncate tracking-wide">{sub.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono font-bold mt-0.5">{pct}% completed</p>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    <div className="w-full bg-[#16181D] h-1.5 rounded-full overflow-hidden border border-border/20">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ 
                          backgroundColor: sub.color, 
                          width: `${pct}%`,
                          boxShadow: `0 0 6px ${sub.color}30`
                        }}
                      />
                    </div>
                    <Link
                      href={`/subjects/${sub.id}`}
                      className="flex items-center justify-center text-[10px] font-mono font-bold uppercase tracking-wider text-primary bg-[#16181D] hover:bg-[#16181D]/80 border border-border/40 hover:border-border/80 rounded-button w-full text-center py-2 h-8.5 transition-all cursor-pointer shadow-xs"
                    >
                      Open Course Details
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
